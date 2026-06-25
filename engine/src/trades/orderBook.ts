const DEFAULT_QUOTE_CURRENCY = "USD";
const EPSILON = 0.00000001;

export interface order {
    userId: string;
    quortAssert: string;
    price: number;
    quantity: number;
    side: "BUY" | "SELL";
    orderId: string;
    filled: number;
}

export interface fills {
    price: number;
    quantity: number;
    tradeId: string;
    otherUserId: string;
    markerOrderId: string;
}

export class orderBook {
    bits: order[] = [];
    asks: order[] = [];
    base_asset: string;
    quote_asset: string = DEFAULT_QUOTE_CURRENCY;
    currentPrice: number;
    lastTradeId: number;

    constructor(
        bids: order[],
        asks: order[],
        base_assert: string,
        quote_assert: string = DEFAULT_QUOTE_CURRENCY,
        currentPrice: number = 0,
        lastTradeId: number = 0
    ) {
        this.bits = bids || [];
        this.asks = asks || [];
        this.base_asset = base_assert;
        this.quote_asset = quote_assert || DEFAULT_QUOTE_CURRENCY;
        this.currentPrice = currentPrice || 0;
        this.lastTradeId = lastTradeId || 0;
    }

    getSnapshot() {
        return {
            baseAsset: this.base_asset,
            quoteAsset: this.quote_asset,
            bids: this.bits,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        };
    }

    addOrder(order: order, shouldPost: boolean = true): { fills: fills[], executedQuantity: number } {
        if (order.side === "BUY") {
            const { fills, executedQuantity } = this.matchBids(order);

            if (order.quantity - order.filled <= EPSILON) {
                return { fills, executedQuantity };
            }

            if (shouldPost) {
                this.bits.push(order);
            }
            return { fills, executedQuantity };

        } else {
            const { fills, exicutedQuantity } = this.matchAsks(order);

            if (order.quantity - order.filled <= EPSILON) {
                return { fills, executedQuantity: exicutedQuantity };
            }

            if (shouldPost) {
                this.asks.push(order);
            }
            return { fills, executedQuantity: exicutedQuantity };
        }
    }

    matchBids(order: order): { fills: fills[], executedQuantity: number } {
        const fills: fills[] = [];
        let exicutedQuantity = 0;

        this.asks.sort((a, b) => a.price - b.price);

        for (let i = 0; i < this.asks.length; i++) {
            const ask = this.asks[i];
            if (!ask) continue;

            const remainingOrderQty = order.quantity - order.filled;
            const remainingAskQty = ask.quantity - ask.filled;

            if (remainingOrderQty <= 0) break;
            if (remainingAskQty <= 0) continue;
            if (order.price < ask.price) break;

            const tradeQty = Math.min(remainingOrderQty, remainingAskQty);

            order.filled += tradeQty;
            ask.filled += tradeQty;
            exicutedQuantity += tradeQty;
            this.currentPrice = ask.price;
        
            fills.push({
                price: ask.price,
                quantity: tradeQty,
                tradeId: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
                otherUserId: ask.userId,
                markerOrderId: ask.orderId
            });

            if (ask.quantity - ask.filled <= EPSILON) {
                this.asks.splice(i, 1);
                i--;
            }
        }

        return { fills, executedQuantity: exicutedQuantity };
    }

    matchAsks(order: order): { fills: fills[], exicutedQuantity: number } {
        const fills: fills[] = [];
        let exicutedQty = 0;

        this.bits.sort((a, b) => b.price - a.price);

        for (let i = 0; i < this.bits.length; i++) {
            const bid = this.bits[i];
            if (!bid) continue;

            const remainingOrderQty = order.quantity - order.filled;
            const remainingBidQty = bid.quantity - bid.filled;

            if (remainingOrderQty <= 0) break;
            if (remainingBidQty <= 0) continue;
            if (order.price > bid.price) break;

            const tradeQty = Math.min(remainingOrderQty, remainingBidQty);

            order.filled += tradeQty;
            bid.filled += tradeQty;
            exicutedQty += tradeQty;
            this.currentPrice = bid.price;

            fills.push({
                price: bid.price,
                quantity: tradeQty,
                tradeId: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
                otherUserId: bid.userId,
                markerOrderId: bid.orderId
            });

            if (bid.quantity - bid.filled <= EPSILON) {
                this.bits.splice(i, 1);
                i--;
            }
        }

        return { fills, exicutedQuantity: exicutedQty };
    }

    getDepth() {
        const bidsObj: { [key: string]: number } = {};
        const asksObj: { [key: string]: number } = {};

        for (const b of this.bits) {
            const remaining = Math.max(0, b.quantity - b.filled);
            if (remaining > EPSILON) {
                bidsObj[b.price] = (bidsObj[b.price] || 0) + remaining;
            }
        }

        for (const a of this.asks) {
            const remaining = Math.max(0, a.quantity - a.filled);
            if (remaining > EPSILON) {
                asksObj[a.price] = (asksObj[a.price] || 0) + remaining;
            }
        }

        const bids: [string, string][] = Object.entries(bidsObj)
            .sort(([a], [b]) => Number(b) - Number(a))
            .slice(0, 10)
            .map(([price, quantity]) => [price, quantity.toString()]);

        const asks: [string, string][] = Object.entries(asksObj)
            .sort(([a], [b]) => Number(a) - Number(b))
            .slice(0, 10)
            .map(([price, quantity]) => [price, quantity.toString()]);

        return { bids, asks };
    }

    cancelOrder(orderId: string): order | undefined {
        const bidIndex = this.bits.findIndex(bit => bit.orderId === orderId);
        if (bidIndex !== -1) {
            return this.bits.splice(bidIndex, 1)[0];
        }

        const askIndex = this.asks.findIndex(ask => ask.orderId === orderId);
        if (askIndex !== -1) {
            return this.asks.splice(askIndex, 1)[0];
        }

        return undefined;
    }

    getOpenOrders(userId: string): order[] {
        const bids = this.bits.filter(bit => bit.userId === userId);
        const asks = this.asks.filter(ask => ask.userId === userId);
        return [...bids, ...asks];
    }
}
