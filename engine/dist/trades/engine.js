// engine.ts - Complete version with deposit and withdraw
import fs from "fs";
import { CANCEL_ORDER as CancelOrder, CREATE_ORDER as CreateOrder, GET_DEPTH as getDepth, GET_OPEN_ORDERS as getOpenOrders, GET_BALANCE as GetBalance, ON_RAMP as onRamp, OFF_RAMP as offRamp, } from "../types/api-types.js";
export const BASE_CURRENCY = "USD";
import { orderBook } from "./orderBook.js";
import { redisManager } from "../RedisManager.js";
import { ADD_TRADE, ORDER_UPDATE } from "../types/index.js";
export class Engine {
    orderBook = [];
    balances = new Map();
    snapshotPath = "./snapshot.json";
    constructor() {
        // load snapshot sync (keeps constructor sync)
        try {
            if (process.env.WITH_SNAPSHOT && fs.existsSync(this.snapshotPath)) {
                const raw = fs.readFileSync(this.snapshotPath, "utf-8");
                const snapObj = JSON.parse(raw);
                this.orderBook = (snapObj.orderBook || []).map((o) => new orderBook(o.bids || o.bits || [], o.asks || [], o.base_asset || o.baseAsset || "TATA", o.currentPrice || 0, o.lastTradeId || 0));
                this.balances = this.normalizeBalances(new Map(snapObj.balance || []));
                console.log("Loaded snapshot:", this.snapshotPath);
            }
            else {
                // default starting state
                this.orderBook = [new orderBook([], [], "TATA", 0, 0)];
                this.setBaseBalances();
            }
        }
        catch (e) {
            console.error("Failed to load snapshot, starting fresh:", e);
            this.orderBook = [new orderBook([], [], "TATA", 0, 0)];
            this.setBaseBalances();
        }
        // periodic snapshot save (synchronous write to keep things simple)
        setInterval(() => {
            try {
                this.saveSnapshot();
            }
            catch (e) {
                console.error("saveSnapshot error:", e);
            }
        }, 60 * 1000);
    }
    normalizeBalances(rawBalances) {
        rawBalances.forEach((wallet) => {
            if (!wallet[BASE_CURRENCY] && wallet.INR) {
                wallet[BASE_CURRENCY] = wallet.INR;
                delete wallet.INR;
            }
        });
        return rawBalances;
    }
    saveSnapshot() {
        const snapShortObj = {
            orderBook: this.orderBook.map((o) => o.getSnapshot()),
            balance: Array.from(this.balances.entries()),
        };
        try {
            fs.writeFileSync(this.snapshotPath, JSON.stringify(snapShortObj, null, 2), "utf-8");
        }
        catch (e) {
            console.error("Failed to write snapshot:", e);
        }
    }
    // main router for incoming API messages
    process({ message, ClientId }) {
        switch (message.type) {
            case CreateOrder: {
                try {
                    const quantity = Number(message.data.quantity);
                    const price = Number(message.data.price);
                    const side = message.data.side;
                    const market = message.data.market;
                    const { executedQty, fills, orderId } = this.createOrder(quantity, price, side, market, message.data.userId);
                    // publish order placed
                    redisManager.publishToApi(ClientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills,
                        },
                    });
                }
                catch (e) {
                    console.error(`Error processing order for user ${ClientId}:`, e);
                    redisManager.publishToApi(ClientId, {
                        type: "ORDER_CANCELED",
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
                    const orderId = message.data.orderId;
                    const market = message.data.market;
                    const base_asset = market.split("_")[0];
                    const quote_asset = market.split("_")[1];
                    if (!base_asset || !quote_asset) {
                        throw new Error("Invalid market format");
                    }
                    const cancelOrderBook = this.orderBook.find((o) => o.base_asset === base_asset);
                    if (!cancelOrderBook)
                        throw new Error("Order book not found");
                    // find in asks or bids
                    const foundOrder = cancelOrderBook.asks.find((o) => o.orderId === orderId) ||
                        cancelOrderBook.bits.find((o) => o.orderId === orderId);
                    if (!foundOrder)
                        throw new Error("Order not found");
                    // compute remaining value/quantity and release locked funds accordingly
                    const remainingQty = Math.max(0, foundOrder.quantity - (foundOrder.filled || 0));
                    if (foundOrder.side === "BUY") {
                        // BUY had quote locked (price * remainingQty)
                        const release = remainingQty * foundOrder.price;
                        const userBal = this.balances.get(foundOrder.userId);
                        if (userBal && userBal[quote_asset]) {
                            userBal[quote_asset].locked = Math.max(0, userBal[quote_asset].locked - release);
                            userBal[quote_asset].available =
                                (userBal[quote_asset].available || 0) + release;
                        }
                        // publish depth update for that price level
                        this.updateDepth(market, orderId, foundOrder.price);
                    }
                    else {
                        // SELL had base locked (remainingQty)
                        const release = remainingQty;
                        const userBal = this.balances.get(foundOrder.userId);
                        if (userBal && userBal[base_asset]) {
                            userBal[base_asset].locked = Math.max(0, userBal[base_asset].locked - release);
                            userBal[base_asset].available =
                                (userBal[base_asset].available || 0) + release;
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
                }
                catch (e) {
                    console.error(`Error cancelling order for user ${ClientId}:`, e);
                }
                break;
            }
            case getOpenOrders: {
                try {
                    const [base, quote] = message.data.market.split("_");
                    const book = this.orderBook.find((o) => o.base_asset === base && o.quote_asset === quote);
                    const openOrders = book?.getOpenOrders(message.data.userId) || [];
                    redisManager.publishToApi(ClientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders,
                    });
                }
                catch (e) {
                    console.error(`Error fetching open orders for user ${ClientId}:`, e);
                }
                break;
            }
            case onRamp: {
                try {
                    const amount = Number(message.data.amount);
                    const userId = message.data.userId;
                    this.onRamp(userId, amount);
                    // Send confirmation back to API
                    redisManager.publishToApi(ClientId, {
                        type: "DEPOSIT_SUCCESS",
                        payload: {
                            amount,
                            currency: BASE_CURRENCY,
                            balance: this.getBalances(userId),
                        },
                    });
                }
                catch (e) {
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
                }
                catch (e) {
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
                    const [base, quote] = message.data.market.split("_");
                    const book = this.orderBook.find((o) => o.base_asset == base && o.quote_asset == quote);
                    const payload = book?.getDepth() || { bids: [], asks: [] };
                    redisManager.publishToApi(ClientId, {
                        type: "GET_DEPTH",
                        payload,
                    });
                }
                catch (e) {
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
                }
                catch (e) {
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
                console.warn("Unhandled message type:", message.type);
                break;
        }
    }
    onRamp(ClientId, amount) {
        const balance = this.balances.get(ClientId);
        if (!balance) {
            this.balances.set(ClientId, {
                [BASE_CURRENCY]: {
                    available: amount,
                    locked: 0,
                },
            });
        }
        else {
            balance[BASE_CURRENCY] = balance[BASE_CURRENCY] || {
                available: 0,
                locked: 0,
            };
            balance[BASE_CURRENCY].available += amount;
        }
    }
    offRamp(ClientId, amount, asset) {
        const balance = this.balances.get(ClientId);
        if (!balance) {
            throw new Error("User balance not found");
        }
        if (!balance[asset]) {
            throw new Error(`Asset ${asset} not found in user balance`);
        }
        if (balance[asset].available < amount) {
            throw new Error(`Insufficient ${asset} balance`);
        }
        balance[asset].available -= amount;
    }
    // Accepts market (either base or full "BASE_QUOTE"), orderId, price
    updateDepth(market, orderId, price) {
        // market might be "BASE" or "BASE_QUOTE"
        const base = market.includes("_") ? market.split("_")[0] : market;
        const orderBook = this.orderBook.find((o) => o.base_asset === base);
        if (!orderBook)
            return;
        const fullMarket = `${orderBook.base_asset}_${orderBook.quote_asset || BASE_CURRENCY}`;
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
    createOrder(quantity, price, side, market, ClientId) {
        const base_asset = market.split("_")[0];
        const quote_asset = market.split("_")[1];
        if (!base_asset || !quote_asset) {
            throw new Error("Invalid market format");
        }
        const orderBook = this.orderBook.find((o) => o.base_asset === base_asset && o.quote_asset === quote_asset);
        if (!orderBook) {
            throw new Error(`Order book not found for market: ${market}`);
        }
        // check and lock funds (throws if insufficient)
        this.checkAndLock(quantity, price, side, base_asset, quote_asset, ClientId);
        const order = {
            quortAssert: quote_asset,
            price,
            quantity,
            side,
            userId: ClientId,
            filled: 0,
            orderId: Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15),
        };
        const { fills, executedQuantity } = orderBook.addOrder(order);
        // update balances as per fills
        this.updateBalances(ClientId, executedQuantity, fills, base_asset, quote_asset, side);
        // persist and publish
        this.createDbTrade(fills, market, side);
        this.createDbOrder(order, fills, executedQuantity, market);
        this.publishWsTrades(fills, market, side);
        this.publishWsDepth(side, market, price, fills);
        return { executedQty: executedQuantity, fills, orderId: order.orderId };
    }
    publishWsDepth(side, market, price, fills) {
        const orderBook = this.orderBook.find((o) => o.base_asset === market.split("_")[0] &&
            o.quote_asset === market.split("_")[1]);
        if (!orderBook)
            return;
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
        }
        else {
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
    publishWsTrades(fills, market, side) {
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
    createDbOrder(order, fills, executedQuantity, market) {
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
                    orderId: fill.markerOrderId || "",
                    executedQuantity: fill.quantity,
                },
            });
        });
    }
    createDbTrade(fills, market, side) {
        fills.forEach((fill) => {
            redisManager.pushToDb({
                type: ADD_TRADE,
                data: {
                    id: String(fill.tradeId),
                    price: fill.price,
                    quantity: fill.quantity,
                    timeStramp: Date.now(),
                    isBuyerMaker: side == "SELL" ? true : false,
                    quoteQuantity: (fill.price * fill.quantity).toString(),
                    market,
                },
            });
        });
    }
    updateBalances(ClientId, executedQuantity, fills, base_asset, quote_asset, side) {
        const userBalance = this.balances.get(ClientId);
        if (!userBalance)
            return;
        // ensure keys exist
        userBalance[base_asset] = userBalance[base_asset] || {
            available: 0,
            locked: 0,
        };
        userBalance[quote_asset] = userBalance[quote_asset] || {
            available: 0,
            locked: 0,
        };
        if (side === "BUY") {
            fills.forEach((fill) => {
                // buyer receives base asset quantity, and quote locked decreases by price*qty
                const baseBalance = userBalance[base_asset];
                const quoteBalance = userBalance[quote_asset];
                if (baseBalance)
                    baseBalance.available += fill.quantity;
                if (quoteBalance)
                    quoteBalance.locked = Math.max(0, quoteBalance.locked - fill.quantity * fill.price);
            });
        }
        else {
            fills.forEach((fill) => {
                // seller had base locked and now base locked reduces; quote available increases
                const baseBalance = userBalance[base_asset];
                const quoteBalance = userBalance[quote_asset];
                if (baseBalance)
                    baseBalance.locked = Math.max(0, baseBalance.locked - fill.quantity);
                if (quoteBalance)
                    quoteBalance.available += fill.quantity * fill.price;
            });
        }
    }
    checkAndLock(quantity, price, side, base_asset, quote_asset, ClientId) {
        // ensure user exists
        const userBal = this.balances.get(ClientId);
        if (!userBal)
            throw new Error("User balance not found");
        userBal[base_asset] = userBal[base_asset] || { available: 0, locked: 0 };
        userBal[quote_asset] = userBal[quote_asset] || { available: 0, locked: 0 };
        if (side === "BUY") {
            const cost = price * quantity;
            if ((userBal[quote_asset].available || 0) < cost) {
                throw new Error("Insufficient balance");
            }
            userBal[quote_asset].available -= cost;
            userBal[quote_asset].locked += cost;
        }
        else {
            if ((userBal[base_asset].available || 0) < quantity) {
                throw new Error("Insufficient balance");
            }
            userBal[base_asset].available -= quantity;
            userBal[base_asset].locked += quantity;
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
    getBalances(ClientId) {
        return this.balances.get(ClientId) || {};
    }
}
//# sourceMappingURL=engine.js.map