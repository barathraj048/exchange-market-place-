// engine.ts
import fs from "fs";
import {
  CANCEL_ORDER as CancelOrder,
  CREATE_ORDER as CreateOrder,
  GET_DEPTH as getDepth,
  GET_OPEN_ORDERS as getOpenOrders,
  type MessageFromApi,
  ON_RAMP as onRamp,
} from "../types/api-types.js";

export const BASE_CURRENCY = "INR";

import {  orderBook, type  order, type fills } from "./orderBook.js";
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
      if (process.env.WITH_SNAPSHORT && fs.existsSync(this.snapshotPath)) {
        const raw = fs.readFileSync(this.snapshotPath, "utf-8");
        const snapObj = JSON.parse(raw);
        this.orderBook = (snapObj.orderBook || []).map((o: any) =>
          new orderBook(o.bits || [], o.asks || [], o.base_asset || o.baseAsset || "TATA", o.currentPrice || 0, o.lastTradeId || 0)
        );
        this.balances = new Map(snapObj.balance || []);
        console.log("Loaded snapshot:", this.snapshotPath);
      } else {
        // default starting state
        this.orderBook = [new orderBook([], [], "TATA", 0, 0)];
        this.setBaseBalances();
      }
    } catch (e) {
      console.error("Failed to load snapshot, starting fresh:", e);
      this.orderBook = [new orderBook([], [], "TATA", 0, 0)];
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

  saveSnapshot() {
    const snapShortObj = {
      orderBook: this.orderBook.map((o) => o.getSnapshot()),
      balance: Array.from(this.balances.entries()),
    };
    try {
      fs.writeFileSync(this.snapshotPath, JSON.stringify(snapShortObj, null, 2), "utf-8");
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

          const { executedQty, fills, orderId } = this.createOrder(quantity, price, side, market, ClientId);

          // publish order placed
          redisManager.publishToApi(ClientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId,
              executedQty,
              fills,
            },
          });
        } catch (e) {
          console.error(`Error processing order for user ${ClientId}:`, e);
          redisManager.publishToApi(ClientId, {
            type: "ORDER_CANCELED",
            payload: {
              orderId: "",
              executedQuantity: 0,
              remainingQuantity: 0,
            },
          });
        }
        break;
      }

      case CancelOrder: {
        try {
          const orderId = message.data.orderId as string;
          const market = message.data.market as string;
          const base_assert = market.split("_")[0];
          const quote_assert = market.split("_")[1];

          if (!base_assert || !quote_assert) {
            throw new Error("Invalid market format");
          }

          const cancelOrderBook = this.orderBook.find((o) => o.base_asset === base_assert);
          if (!cancelOrderBook) throw new Error("Order book not found");

          // find in asks or bits
          const foundOrder = cancelOrderBook.asks.find((o) => o.orderId === orderId) || cancelOrderBook.bits.find((o) => o.orderId === orderId);
          if (!foundOrder) throw new Error("Order not found");

          // compute remaining value/quantity and release locked funds accordingly
          const remainingQty = Math.max(0, foundOrder.quantity - (foundOrder.filled || 0));

          if (foundOrder.side === "BUY") {
            // BUY had quote locked (price * remainingQty)
            const release = remainingQty * foundOrder.price;
            const userBal = this.balances.get(ClientId);
            if (userBal && userBal[quote_assert]) {
              userBal[quote_assert].locked = Math.max(0, userBal[quote_assert].locked - release);
              userBal[quote_assert].available = (userBal[quote_assert].available || 0) + release;
            }
            // publish depth update for that price level
            this.updateDepth(market, orderId, foundOrder.price);
          } else {
            // SELL had base locked (remainingQty)
            const release = remainingQty;
            const userBal = this.balances.get(ClientId);
            if (userBal && userBal[base_assert]) {
              userBal[base_assert].locked = Math.max(0, userBal[base_assert].locked - release);
              userBal[base_assert].available = (userBal[base_assert].available || 0) + release;
            }
            this.updateDepth(market, orderId, foundOrder.price);
          }

          redisManager.publishToApi(ClientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId,
              executedQty: 0,
              remainingQty: 0,
            },
          });
        } catch (e) {
          console.error(`Error cancelling order for user ${ClientId}:`, e);
        }
        break;
      }

      case getOpenOrders: {
        try {
          const [base, quote] = (message.data.market as string).split("_");
          const book = this.orderBook.find((o) => o.base_asset === base && o.quote_asset === quote);
          const openOrders: order[] = book?.getOpenOrders(ClientId) || [];
          redisManager.publishToApi(ClientId, {
            type: "OPEN_ORDERS",
            payload: openOrders,
          });
        } catch (e) {
          console.error(`Error fetching open orders for user ${ClientId}:`, e);
        }
        break;
      }

      case onRamp: {
        const amount = Number(message.data.amount);
        this.onRamp(ClientId, amount);
        break;
      }

      case getDepth: {
        try {
          const [base, quote] = (message.data.market as string).split("_");
          const book = this.orderBook.find((o) => o.base_asset == base && o.quote_asset == quote);
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

      default:
        // unknown message type - ignore or log
        console.warn("Unhandled message type:", (message as MessageFromApi).type);
        break;
    }
  }

  onRamp(ClientId: string, amount: number) {
    const balance = this.balances.get(ClientId);
    if (!balance) {
      this.balances.set(ClientId, {
        [BASE_CURRENCY]: {
          available: amount,
          locked: 0,
        },
      });
    } else {
      balance[BASE_CURRENCY] = balance[BASE_CURRENCY] || { available: 0, locked: 0 };
      balance[BASE_CURRENCY].available += amount;
    }
  }

  // Accepts market (either base or full "BASE_QUOTE"), orderId, price
  updateDepth(maker: string, orderId: string, price: number) {
    // maker might be "BASE" or "BASE_QUOTE"
    const base = maker.includes("_") ? maker.split("_")[0] : maker;
    const orderBook = this.orderBook.find((o) => o.base_asset === base);
    if (!orderBook) return;
    const market = `${orderBook.base_asset}_${orderBook.quote_asset || BASE_CURRENCY}`;
    const depth = orderBook.getDepth();

    const updatedBids = depth.bids.filter((b) => b[0] === price.toString());
    const updatedAsks = depth.asks.filter((a) => a[0] === price.toString());

    redisManager.publishTrade(`depth@${market}`, {
      stream: `depth@${market}`,
      data: {
        e: "depth",
        a: updatedAsks.length ? updatedAsks : [[price.toString(), "0"]],
        b: updatedBids.length ? updatedBids : [[price.toString(), "0"]],
      },
    });
  }

  createOrder(quantity: number, price: number, side: "BUY" | "SELL", market: string, ClientId: string) {
    const base_assert = market.split("_")[0];
    const quote_assert = market.split("_")[1];
    
    if (!base_assert || !quote_assert) {
      throw new Error("Invalid market format");
    }
    
    const orderBook = this.orderBook.find((o) => o.base_asset === base_assert && o.quote_asset === quote_assert);

    if (!orderBook) {
      console.warn("Order book not found for market:", market);
      // still check balances/throw if needed
    }

    // check and lock funds (throws if insufficient)
    this.checkAndLock(quantity, price, side, base_assert, quote_assert, ClientId);

    const order: order = {
      quortAssert: quote_assert, // kept original property name to match your order type
      price,
      quantity,
      side,
      userId: ClientId,
      filled: 0,
      orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };

    const { fills, executedQuantity } = orderBook!.addOrder(order);

    // update balances as per fills
    this.updateBalances(ClientId, executedQuantity, fills, base_assert, quote_assert, side);

    // persist and publish
    this.createDbTrade(fills, market, side);
    this.createDbOrder(order, fills, executedQuantity, market);
    this.publishWsTrades(fills, market, side);
    this.publishWsDepth(side, market, price, fills);

    return { executedQty: executedQuantity, fills, orderId: order.orderId };
  }

  publishWsDepth(side: "BUY" | "SELL", market: string, price: number, fills: fills[]) {
    const orderBook = this.orderBook.find((o) => o.base_asset === market.split("_")[0] && o.quote_asset === market.split("_")[1]);
    if (!orderBook) return;
    const depth = orderBook.getDepth();

    if (side === "BUY") {
      const updatedAsks = depth.asks.filter((a) => fills.map((f) => f.price.toString()).includes(a[0]));
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
      const updatedBids = depth.bids.filter((b) => fills.map((f) => f.price.toString()).includes(b[0]));
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

  createDbOrder(order: order, fills: fills[], executedQuantity: number, market: string) {
    // main order update
    redisManager.pushToDb({
      type: ORDER_UPDATE,
      data: {
        orderId: order.orderId,
        executedQuantity: executedQuantity,
        price: order.price,
        quantity: order.quantity,
        market,
        side: order.side,
      },
    });

    // update maker orders (those that were partially/fully filled)
    fills.forEach((fill) => {
      redisManager.pushToDb({
        type: ORDER_UPDATE,
        data: {
          orderId: (fill as any).markerOrderId || (fill as any).makerOrderId || "",
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
          quantity: fill.quantity,
          timeStramp: Date.now(),
          isBuyerMaker: side == "SELL" ? true : false, // if sell then buyer is maker
          quoteQuantity: (fill.price * fill.quantity).toString(),
          market,
        },
      });
    });
  }

  updateBalances(ClientId: string, executedQuantity: number, fills: fills[], base_assert: string, quote_assert: string, side: "BUY" | "SELL") {
    const userBalance = this.balances.get(ClientId);
    if (!userBalance) return;

    // ensure keys exist
    userBalance[base_assert] = userBalance[base_assert] || { available: 0, locked: 0 };
    userBalance[quote_assert] = userBalance[quote_assert] || { available: 0, locked: 0 };

    if (side === "BUY") {
      fills.forEach((fill) => {
        // buyer receives base asset quantity, and quote locked decreases by price*qty
        const baseBalance = userBalance[base_assert];
        const quoteBalance = userBalance[quote_assert];
        if (baseBalance) baseBalance.available += fill.quantity;
        if (quoteBalance) quoteBalance.locked = Math.max(0, quoteBalance.locked - fill.quantity * fill.price);
      });
    } else {
      fills.forEach((fill) => {
        // seller had base locked and now base locked reduces; quote available increases
        const baseBalance = userBalance[base_assert];
        const quoteBalance = userBalance[quote_assert];
        if (baseBalance) baseBalance.locked = Math.max(0, baseBalance.locked - fill.quantity);
        if (quoteBalance) quoteBalance.available += fill.quantity * fill.price;
      });
    }
  }

  checkAndLock(quantity: number, price: number, side: "BUY" | "SELL", base_assert: string, quote_assert: string, ClientId: string) {
    // ensure user exists
    const userBal = this.balances.get(ClientId);
    if (!userBal) throw new Error("User balance not found");

    userBal[base_assert] = userBal[base_assert] || { available: 0, locked: 0 };
    userBal[quote_assert] = userBal[quote_assert] || { available: 0, locked: 0 };

    if (side === "BUY") {
      const cost = price * quantity;
      if ((userBal[quote_assert].available || 0) < cost) {
        throw new Error("Insufficient balance");
      }
      userBal[quote_assert].available -= cost;
      userBal[quote_assert].locked += cost;
    } else {
      if ((userBal[base_assert].available || 0) < quantity) {
        throw new Error("Insufficient balance");
      }
      userBal[base_assert].available -= quantity;
      userBal[base_assert].locked += quantity;
    }
  }

  setBaseBalances() {
    // seed balances for users 1,2,5
    const seed = ["1", "2", "5"];
    seed.forEach((id) => {
      this.balances.set(id, {
        [BASE_CURRENCY]: { available: 10_000_000, locked: 0 },
        TATA: { available: 10_000_000, locked: 0 },
      });
    });
  }
}
