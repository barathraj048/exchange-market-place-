// engine.ts - Complete version with deposit and withdraw
import fs from "fs";
import {
  CANCEL_ORDER as CancelOrder,
  CREATE_ORDER as CreateOrder,
  GET_DEPTH as getDepth,
  GET_OPEN_ORDERS as getOpenOrders,
  GET_BALANCE as GetBalance,
  ON_RAMP as onRamp,
  OFF_RAMP as offRamp,
  type MessageFromApi,
} from "../types/api-types.js";

export const BASE_CURRENCY = "USD";
const EPSILON = 0.00000001;
const MARKET_SLIPPAGE_BUFFER = 0.001;

import { orderBook, type order, type fills } from "./orderBook.js";
import { redisManager } from "../RedisManager.js";
import { ADD_TRADE, ORDER_UPDATE } from "../types/index.js";

interface UserBalance {
  [key: string]: {
    available: number;
    locked: number;
  };
}

export class Engine {
  private orderBook: orderBook[] = [];
  private balances: Map<string, UserBalance> = new Map();
  private snapshotPath = "./snapshot.json";

  constructor() {
    // load snapshot sync (keeps constructor sync)
    try {
      if (process.env.WITH_SNAPSHOT && fs.existsSync(this.snapshotPath)) {
        const raw = fs.readFileSync(this.snapshotPath, "utf-8");
        const snapObj = JSON.parse(raw);
        this.orderBook = (snapObj.orderBook || []).map((o: any) =>
          new orderBook(
            o.bids || o.bits || [],
            o.asks || [],
            o.base_asset || o.baseAsset || "TATA",
            o.quote_asset || o.quoteAsset || BASE_CURRENCY,
            o.currentPrice || 0,
            o.lastTradeId || 0
          )
        );
        this.balances = this.normalizeBalances(new Map(snapObj.balance || []));
        console.log("Loaded snapshot:", this.snapshotPath);
      } else {
        // default starting state
        this.orderBook = this.getDefaultOrderBooks();
        this.setBaseBalances();
      }
    } catch (e) {
      console.error("Failed to load snapshot, starting fresh:", e);
      this.orderBook = this.getDefaultOrderBooks();
      this.setBaseBalances();
    }

    // periodic snapshot save (synchronous write to keep things simple)
    setInterval(() => {
      try {
        this.saveSnapshot();
      } catch (e) {
        console.error("saveSnapshot error:", e);
      }
    }, 60 * 1000);
  }


  private normalizeBalances(rawBalances: Map<string, UserBalance>) {
    rawBalances.forEach((wallet) => {
      if (!wallet[BASE_CURRENCY] && wallet.INR) {
        wallet[BASE_CURRENCY] = { ...wallet.INR };
      }
    });
    return rawBalances;
  }

  private getDefaultOrderBooks() {
    return [
      new orderBook([], [], "TATA", BASE_CURRENCY),
      new orderBook([], [], "TATA", "INR"),
      new orderBook([], [], "SOL", "USDC"),
    ];
  }

  private parseMarket(market: string) {
    const [base_asset, quote_asset] = market.split("_");
    if (!base_asset || !quote_asset) {
      throw new Error("Invalid market format");
    }

    return { base_asset, quote_asset };
  }

  private getOrderBook(base_asset: string, quote_asset: string) {
    return this.orderBook.find(
      (o) => o.base_asset === base_asset && o.quote_asset === quote_asset
    );
  }

  private getOrCreateOrderBook(base_asset: string, quote_asset: string) {
    let book = this.getOrderBook(base_asset, quote_asset);
    if (!book) {
      book = new orderBook([], [], base_asset, quote_asset);
      this.orderBook.push(book);
    }

    return book;
  }

  private getOrCreateBalance(userId: string) {
    let balance = this.balances.get(userId);
    if (!balance) {
      balance = {};
      this.balances.set(userId, balance);
    }

    return balance;
  }

  private ensureAssetBalance(balance: UserBalance, asset: string) {
    let assetBalance = balance[asset];
    if (!assetBalance) {
      assetBalance = { available: 0, locked: 0 };
      balance[asset] = assetBalance;
    }

    return assetBalance;
  }

  saveSnapshot() {
    const snapShortObj = {
      orderBook: this.orderBook.map((o) => o.getSnapshot()),
      balance: Array.from(this.balances.entries()),
    };
    try {
      fs.writeFileSync(
        this.snapshotPath,
        JSON.stringify(snapShortObj, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error("Failed to write snapshot:", e);
    }
  }

  // main router for incoming API messages
  process({ message, ClientId }: { message: MessageFromApi; ClientId: string }) {
    switch (message.type) {
  case CreateOrder: {
    try {
      const quantity = Number(message.data.quantity);
      const price = Number(message.data.price);
      const side = message.data.side as "BUY" | "SELL";
      const market = message.data.market as string;
      const orderType = (message.data.orderType || "LIMIT") as "LIMIT" | "MARKET";

      const { executedQty, fills, orderId } = this.createOrder(
        quantity,
        price,
        side,
        market,
        message.data.userId,
        orderType,
      );

      redisManager.publishToApi(ClientId, {
        type: "ORDER_PLACED",
        payload: {
          orderId,
          executedQty,
          fills,
        },
      });
    } catch (e: any) {
      console.error(`Error processing order for user ${ClientId}:`, e);
      redisManager.publishToApi(ClientId, {
        type: "ORDER_REJECTED",
        payload: {
          orderId: "",
          executedQuantity: 0,
          remainingQuantity: 0,
          error: e.message,
        },
      });
    }
    break;
  }

      case CancelOrder: {
        try {
          const orderId = message.data.orderId as string;
          const market = message.data.market as string;
          const { base_asset, quote_asset } = this.parseMarket(market);

          const cancelOrderBook = this.getOrderBook(base_asset, quote_asset);
          if (!cancelOrderBook) throw new Error("Order book not found");

          const foundOrder = cancelOrderBook.cancelOrder(orderId);
          if (!foundOrder) throw new Error("Order not found");

          // compute remaining value/quantity and release locked funds accordingly
          const remainingQty = Math.max(
            0,
            foundOrder.quantity - (foundOrder.filled || 0)
          );

          if (foundOrder.side === "BUY") {
            // BUY had quote locked (price * remainingQty)
            const release = remainingQty * foundOrder.price;
            const userBal = this.getOrCreateBalance(foundOrder.userId);
            const quoteBalance = this.ensureAssetBalance(userBal, quote_asset);
            quoteBalance.locked = Math.max(0, quoteBalance.locked - release);
            quoteBalance.available += release;
          } else {
            // SELL had base locked (remainingQty)
            const release = remainingQty;
            const userBal = this.getOrCreateBalance(foundOrder.userId);
            const baseBalance = this.ensureAssetBalance(userBal, base_asset);
            baseBalance.locked = Math.max(0, baseBalance.locked - release);
            baseBalance.available += release;
          }

          this.updateDepth(market, orderId, foundOrder.price);

          redisManager.publishToApi(ClientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId,
              executedQty: foundOrder.filled || 0,
              remainingQty,
            },
          });
        } catch (e: any) {
          console.error(`Error cancelling order for user ${ClientId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "ORDER_CANCEL_REJECTED",
            payload: {
              orderId: message.data.orderId,
              error: e.message || "Cancel failed",
            },
          });
        }
        break;
      }

      case getOpenOrders: {
        try {
          const { base_asset, quote_asset } = this.parseMarket(message.data.market as string);
          const book = this.getOrderBook(base_asset, quote_asset);
          const openOrders: order[] = book?.getOpenOrders(message.data.userId) || [];
          redisManager.publishToApi(ClientId, {
            type: "OPEN_ORDERS",
            payload: openOrders,
          });
        } catch (e: any) {
          console.error(`Error fetching open orders for user ${ClientId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "OPEN_ORDERS",
            payload: [],
            error: e.message || "Failed to fetch open orders",
          });
        }
        break;
      }

      case onRamp: {
        try {
          const amount = Number(message.data.amount);
          const userId = message.data.userId;
          const asset=message.data.asset || BASE_CURRENCY
          this.onRamp(userId, amount,asset);
          
          // Send confirmation back to API
          redisManager.publishToApi(ClientId, {
            type: "DEPOSIT_SUCCESS",
            payload: {
              txnId:message.data.txnId,
              amount,
              currency: asset,
              balance: this.getBalances(userId),
            },
          });
        } catch (e: any) {
          console.error(`Error processing deposit for user ${message.data.userId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "DEPOSIT_FAILED",
            payload: {
              error: e.message || "Deposit failed",
            },
          });
        }
        break;
      }

      case offRamp: {
        try {
          const amount = Number(message.data.amount);
          const asset = message.data.asset;
          const userId = message.data.userId;
          this.offRamp(userId, amount, asset);
          
          // Send confirmation back to API
          redisManager.publishToApi(ClientId, {
            type: "WITHDRAW_SUCCESS",
            payload: {
              amount,
              asset,
              balance: this.getBalances(userId),
            },
          });
        } catch (e: any) {
          console.error(`Error processing withdrawal for user ${message.data.userId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "WITHDRAW_FAILED",
            payload: {
              error: e.message || "Withdrawal failed",
            },
          });
        }
        break;
      }

      case getDepth: {
        try {
          const { base_asset, quote_asset } = this.parseMarket(message.data.market as string);
          const book = this.getOrderBook(base_asset, quote_asset);
          const payload = book?.getDepth() || { bids: [], asks: [] };
          redisManager.publishToApi(ClientId, {
            type: "GET_DEPTH",
            payload,
          });
        } catch (e) {
          console.error(`error occurred while fetching depth ${e}`);
          redisManager.publishToApi(ClientId, {
            type: "GET_DEPTH",
            payload: {
              bids: [],
              asks: [],
            },
          });
        }
        break;
      }

      case GetBalance: {
        try {
          const userId = message.data.userId || ClientId;
          const balance = this.getBalances(userId);

          redisManager.publishToApi(ClientId, {
            type: "BALANCE_RESPONSE",
            payload: balance,
          });
        } catch (e) {
          console.error(`Error fetching balance for user ${ClientId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "BALANCE_RESPONSE",
            payload: {},
          });
        }
        break;
      }

      default:
        // unknown message type - ignore or log
        console.warn("Unhandled message type:", (message as MessageFromApi).type);
        break;
    }
  }

  onRamp(ClientId: string, amount: number, asset: string) {
    if (!asset) {
      throw new Error("Asset is required");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const balance = this.getOrCreateBalance(ClientId);
    const assetBalance = this.ensureAssetBalance(balance, asset);
    assetBalance.available += amount;
  }

  offRamp(ClientId: string, amount: number, asset: string) {
    if (!asset) {
      throw new Error("Asset is required");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const balance = this.balances.get(ClientId);
    if (!balance) {
      throw new Error("User balance not found");
    }

    const assetBalance = balance[asset];
    if (!assetBalance) {
      throw new Error(`Asset ${asset} not found in user balance`);
    }

    if (assetBalance.available < amount) {
      throw new Error(`Insufficient ${asset} balance`);
    }

    assetBalance.available -= amount;
  }

  // Accepts market (either base or full "BASE_QUOTE"), orderId, price
  updateDepth(market: string, orderId: string, price: number) {
    const { base_asset, quote_asset } = this.parseMarket(market);
    const orderBook = this.getOrderBook(base_asset, quote_asset);
    if (!orderBook) return;
    const fullMarket = `${orderBook.base_asset}_${orderBook.quote_asset}`;
    const depth = orderBook.getDepth();

    const updatedBids = depth.bids.filter((b) => b[0] === price.toString());
    const updatedAsks = depth.asks.filter((a) => a[0] === price.toString());

    redisManager.publishTrade(`depth@${fullMarket}`, {
      stream: `depth@${fullMarket}`,
      data: {
        e: "depth",
        a: updatedAsks.length ? updatedAsks : [[price.toString(), "0"]],
        b: updatedBids.length ? updatedBids : [[price.toString(), "0"]],
      },
    });
  }

  private estimateMarketBuyCost(orderBook: orderBook, quantity: number) {
    let remaining = quantity;
    let totalCost = 0;
    let worstPrice = 0;
    const asks = [...orderBook.asks].sort((a, b) => a.price - b.price);

    for (const ask of asks) {
      if (remaining <= EPSILON) break;

      const askRemaining = Math.max(0, ask.quantity - ask.filled);
      if (askRemaining <= EPSILON) continue;

      const fillQuantity = Math.min(remaining, askRemaining);
      totalCost += fillQuantity * ask.price;
      remaining -= fillQuantity;
      worstPrice = ask.price; // Track the highest ask we need to hit
    }

    if (remaining > EPSILON) {
      throw new Error("Insufficient liquidity");
    }

    return { totalCost, worstPrice };
  }

  private assertMarketSellLiquidity(orderBook: orderBook, quantity: number) {
    let remaining = quantity;
    let worstPrice = 0;
    const bids = [...orderBook.bits].sort((a, b) => b.price - a.price); // Kept your .bits typo to avoid breaking your types

    for (const bid of bids) {
      if (remaining <= EPSILON) break;

      const bidRemaining = Math.max(0, bid.quantity - bid.filled);
      if (bidRemaining <= EPSILON) continue;

      const fillQuantity = Math.min(remaining, bidRemaining);
      remaining -= fillQuantity;
      worstPrice = bid.price; // Track the lowest bid we need to hit
    }

    if (remaining > EPSILON) {
      throw new Error("Insufficient liquidity");
    }
    
    return { worstPrice };
  }

  private estimateMarketBuyQuantityForBudget(orderBook: orderBook, quoteBudget: number) {
    let remainingBudget = quoteBudget;
    let totalQuantity = 0;
    let worstPrice = 0;
    const asks = [...orderBook.asks].sort((a, b) => a.price - b.price);

    for (const ask of asks) {
      if (remainingBudget <= EPSILON) break;

      const askRemaining = Math.max(0, ask.quantity - ask.filled);
      if (askRemaining <= EPSILON) continue;

      const maxAffordableQty = remainingBudget / ask.price;
      const fillQuantity = Math.min(maxAffordableQty, askRemaining);

      totalQuantity += fillQuantity;
      remainingBudget -= fillQuantity * ask.price;
      worstPrice = ask.price; // Track the highest ask we need to hit
    }

    if (totalQuantity <= EPSILON) {
      throw new Error("Insufficient liquidity for the given amount");
    }

    return { totalQuantity, worstPrice };
  }

  // 2. The Unified createOrder Method
createOrder(
    quantity: number,
    price: number,
    side: "BUY" | "SELL",
    market: string,
    ClientId: string,
    orderType: "LIMIT" | "MARKET" ,
    quoteAmount?: number 
  ) {
    quoteAmount = price;
    
    // 1. Save the true original order type before conversion
    const originalOrderType = orderType; 

    if (side !== "BUY" && side !== "SELL") {
      throw new Error("Invalid order side");
    }

    if (orderType !== "LIMIT" && orderType !== "MARKET") {
      throw new Error("Invalid order type");
    }

    if (orderType === "LIMIT" && (!Number.isFinite(price) || price <= 0)) {
      throw new Error("Price must be greater than 0");
    }
    
    const isQuoteAmountBuy = side === "BUY" && (!Number.isFinite(quantity) || quantity <= 0);

    if (isQuoteAmountBuy) {
      if (!Number.isFinite(quoteAmount) || (quoteAmount as number) <= 0) {
        throw new Error("Quantity or quoteAmount must be greater than 0");
      }
    } else if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const { base_asset, quote_asset } = this.parseMarket(market);
    const orderBook = this.getOrCreateOrderBook(base_asset, quote_asset);
    
    let matchingPrice = price;
    let resolvedQuantity = quantity;
    let quoteAmountToLock = 0;

    // --- KEEPING THE ORIGINAL BUFFER MATH EXACTLY AS BEFORE ---
    if (orderType === "MARKET") {
      if (side === "BUY") {
        if (isQuoteAmountBuy) {
          const { worstPrice } = this.estimateMarketBuyQuantityForBudget(orderBook, quoteAmount as number);
          
          matchingPrice = worstPrice * (1 + MARKET_SLIPPAGE_BUFFER);
          resolvedQuantity = (quoteAmount as number) / matchingPrice;
        } else {
          const { worstPrice } = this.estimateMarketBuyCost(orderBook, quantity);
          matchingPrice = worstPrice * (1 + MARKET_SLIPPAGE_BUFFER);
        }
      } else { 
        const { worstPrice } = this.assertMarketSellLiquidity(orderBook, quantity);
        matchingPrice = worstPrice * (1 - MARKET_SLIPPAGE_BUFFER);
        matchingPrice = Math.max(0, matchingPrice);
      }
      
      orderType = "LIMIT";
    }

    if (side === "BUY") {
       quoteAmountToLock = isQuoteAmountBuy ? (quoteAmount as number) : (matchingPrice * resolvedQuantity);
    } else {
       quoteAmountToLock = 0; 
    }

    this.checkAndLock(resolvedQuantity, quoteAmountToLock, side, base_asset, quote_asset, ClientId);

    const order: order = {
      quortAssert: quote_asset,
      price: matchingPrice,
      quantity: resolvedQuantity,
      side,
      userId: ClientId,
      filled: 0,
      orderId:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    };

    const { fills, executedQuantity } = orderBook.addOrder(order, true);

    // 2. FIX: Pass originalOrderType ("MARKET") so the cleanup block triggers perfectly
    this.updateBalances(
      ClientId,
      fills,
      base_asset,
      quote_asset,
      side,
      matchingPrice, 
      originalOrderType, 
      quoteAmountToLock,
      resolvedQuantity
    );

    this.createDbTrade(fills, market, side);
    this.createDbOrder(order, fills, executedQuantity, market, orderType);
    this.publishWsTrades(fills, market, side);
    this.publishWsDepth(side, market, matchingPrice, fills);

    return { executedQty: executedQuantity, fills, orderId: order.orderId };
  }
  
  publishWsDepth(
    side: "BUY" | "SELL",
    market: string,
    price: number,
    fills: fills[]
  ) {
    const orderBook = this.orderBook.find(
      (o) =>
        o.base_asset === market.split("_")[0] &&
        o.quote_asset === market.split("_")[1]
    );
    if (!orderBook) return;
    const depth = orderBook.getDepth();
    const filledPrices = [...new Set(fills.map((f) => f.price.toString()))];

    if (side === "BUY") {
      const updatedAsks = filledPrices.map((filledPrice) => {
        return depth.asks.find((a) => a[0] === filledPrice) || ([filledPrice, "0"] as [string, string]);
      });
      const updatedBid = depth.bids.find((b) => b[0] === price.toString());
      redisManager.publishTrade(`depth@${market}`, {
        stream: `depth@${market}`,
        data: {
          e: "depth",
          a: updatedAsks,
          b: updatedBid ? [updatedBid] : [],
        },
      });
    } else {
      const updatedAsk = depth.asks.find((a) => a[0] === price.toString());
      const updatedBids = filledPrices.map((filledPrice) => {
        return depth.bids.find((b) => b[0] === filledPrice) || ([filledPrice, "0"] as [string, string]);
      });
      redisManager.publishTrade(`depth@${market}`, {
        stream: `depth@${market}`,
        data: {
          e: "depth",
          a: updatedAsk ? [updatedAsk] : [],
          b: updatedBids,
        },
      });
    }
  }

  publishWsTrades(fills: fills[], market: string, side: "BUY" | "SELL") {
    fills.forEach((fill) => {
      redisManager.publishTrade(`trade@${market}`, {
        stream: `trade@${market}`,
        data: {
          e: "trade",
          t: Number(fill.tradeId),
          m: side == "SELL" ? true : false,
          p: fill.price.toString(),
          q: fill.quantity.toString(),
          s: market,
        },
      });
    });
  }

  createDbOrder(
    order: order,
    fills: fills[],
    executedQuantity: number,
    market: string,
    orderType: "LIMIT" | "MARKET"
  ) {
    // main order update
    redisManager.pushToDb({
      type: ORDER_UPDATE,
      data: {
        orderId: order.orderId,
        executedQuantity: executedQuantity,
        price: orderType === "MARKET" ? 0 : order.price,
        quantity: order.quantity,
        market,
        side: order.side.toLowerCase(),
        orderType,
      },
    });

    // update maker orders (those that were partially/fully filled)
    fills.forEach((fill) => {
      redisManager.pushToDb({
        type: ORDER_UPDATE,
        data: {
          orderId: fill.markerOrderId || "",
          executedQuantity: fill.quantity,
        },
      });
    });
  }

  createDbTrade(fills: fills[], market: string, side: "BUY" | "SELL") {
    fills.forEach((fill) => {
      redisManager.pushToDb({
        type: ADD_TRADE,
        data: {
          id: String(fill.tradeId),
          price: fill.price,
          qty: fill.quantity,
          timestamp: Date.now(),
          buyerMarket: side == "SELL" ? true : false,
          quoteQuantity: (fill.price * fill.quantity).toString(),
          market,
        },
      });
    });
  }

updateBalances(
    ClientId: string,
    fills: fills[],
    base_asset: string,
    quote_asset: string,
    side: "BUY" | "SELL",
    orderPrice: number,
    orderType: "LIMIT" | "MARKET",
    lockedAmount: number = 0,
    requestedQuantity: number = 0
  ) {
    const takerBalance = this.getOrCreateBalance(ClientId);
    const takerBase = this.ensureAssetBalance(takerBalance, base_asset);
    const takerQuote = this.ensureAssetBalance(takerBalance, quote_asset);

    if (side === "BUY") {
      let actualCost = 0;

      fills.forEach((fill) => {
        const makerBalance = this.getOrCreateBalance(fill.otherUserId);
        const makerBase = this.ensureAssetBalance(makerBalance, base_asset);
        const makerQuote = this.ensureAssetBalance(makerBalance, quote_asset);
        const tradeValue = fill.quantity * fill.price;
        actualCost += tradeValue;

        takerBase.available += fill.quantity;
        makerBase.locked = Math.max(0, makerBase.locked - fill.quantity);
        makerQuote.available += tradeValue;

        if (orderType === "LIMIT") {
          // release exactly what this fill reserved at the limit price,
          // refunding any favorable-price difference immediately
          const reservedForFill = fill.quantity * orderPrice;
          takerQuote.locked = Math.max(0, takerQuote.locked - reservedForFill);
          takerQuote.available += Math.max(0, reservedForFill - tradeValue);
        }
      });

      if (orderType === "MARKET") {
        // one reconciliation for the whole order: unlock everything reserved
        // (estimate + slippage buffer) and refund whatever wasn't spent.
        // Also covers a partial fill — any unfilled remainder's reservation
        // is released here too, so nothing is ever left stranded in `locked`.
        takerQuote.locked = Math.max(0, takerQuote.locked - lockedAmount);
        takerQuote.available += Math.max(0, lockedAmount - actualCost);
      }
    } else {
      let actualFilled = 0;

      fills.forEach((fill) => {
        const makerBalance = this.getOrCreateBalance(fill.otherUserId);
        const makerBase = this.ensureAssetBalance(makerBalance, base_asset);
        const makerQuote = this.ensureAssetBalance(makerBalance, quote_asset);
        const tradeValue = fill.quantity * fill.price;

        takerQuote.available += tradeValue;
        makerBase.available += fill.quantity;
        makerQuote.locked = Math.max(0, makerQuote.locked - tradeValue);
        actualFilled += fill.quantity;

        if (orderType === "LIMIT") {
          takerBase.locked = Math.max(0, takerBase.locked - fill.quantity);
        }
      });

      if (orderType === "MARKET") {
        // release the full locked base quantity in one shot; whatever didn't
        // fill (liquidity mismatch at execution time) goes straight back to
        // available instead of staying stuck in locked forever
        takerBase.locked = Math.max(0, takerBase.locked - requestedQuantity);
        const unfilled = Math.max(0, requestedQuantity - actualFilled);
        if (unfilled > EPSILON) {
          takerBase.available += unfilled;
        }
      }
    }
  }

  checkAndLock(
    quantity: number,
    quoteAmountToLock: number,
    side: "BUY" | "SELL",
    base_asset: string,
    quote_asset: string,
    ClientId: string
  ) {
    // ensure user exists
    const userBal = this.balances.get(ClientId);
    if (!userBal) throw new Error("User balance not found");

    const baseBalance = this.ensureAssetBalance(userBal, base_asset);
    const quoteBalance = this.ensureAssetBalance(userBal, quote_asset);

    if (side === "BUY") {
      if (quoteBalance.available + EPSILON < quoteAmountToLock) {
        throw new Error("Insufficient balance");
      }
      quoteBalance.available -= quoteAmountToLock;
      quoteBalance.locked += quoteAmountToLock;
    } else {
      if (baseBalance.available < quantity) {
        throw new Error("Insufficient balance");
      }
      baseBalance.available -= quantity;
      baseBalance.locked += quantity;
    }
  }

setBaseBalances() {
    // 1. Existing manual test accounts
    const seed = ["1", "2", "5"];
    
    // 2. Add the 50 Seed Liquidity Bot Accounts
    for (let i = 1; i <= 50; i++) {
        seed.push(`trader_${i}`);
    }

    // 3. Add the 10 Master Maker Accounts
    for (let i = 0; i < 10; i++) {
        seed.push(`trader_maker_${i}`);
    }

    // 4. Add the 5 Master Taker Accounts
    for (let i = 0; i < 5; i++) {
        seed.push(`trader_taker_${i}`);
    }

    // Distribute 10M of every asset to every account
    seed.forEach((id) => {
      this.balances.set(id, {
        [BASE_CURRENCY]: { available: 10_000_000, locked: 0 },
        INR: { available: 10_000_000, locked: 0 },
        USDC: { available: 10_000_000, locked: 0 },
        TATA: { available: 10_000_000, locked: 0 },
        SOL: { available: 10_000_000, locked: 0 },
        BTC: { available: 10_000_000, locked: 0 },
        ETH: { available: 10_000_000, locked: 0 },
        BNB: { available: 10_000_000, locked: 0 },
        XRP: { available: 10_000_000, locked: 0 },
      });
    });
  }

  getBalances(ClientId: string) {
    return this.balances.get(ClientId) || {};
  }
}
