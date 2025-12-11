import { BASE_CURRENCY } from "./engine.js";
export class orderBook {
    bits = [];
    asks = [];
    base_asset;
    quote_asset = BASE_CURRENCY;
    currentPrice;
    lastTradeId;
    constructor(bids, asks, base_assert, currentPrice, lastTradeId) {
        this.bits = bids || [];
        this.asks = asks || [];
        this.base_asset = base_assert;
        this.currentPrice = currentPrice || 0;
        this.lastTradeId = lastTradeId || 0;
    }
    getSnapshot() {
        return {
            baseAsset: this.base_asset,
            bids: this.bits,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        };
    }
    addOrder(order) {
        if (order.side === "BUY") {
            const { fills, executedQuantity } = this.matchBids(order);
            order.filled += executedQuantity;
            if (executedQuantity === order.quantity) {
                return { fills, executedQuantity };
            }
            this.bits.push(order);
            return { fills, executedQuantity };
        }
        else {
            const { fills, exicutedQuantity } = this.matchAsks(order);
            order.filled += exicutedQuantity;
            if (exicutedQuantity === order.quantity) {
                return { fills, executedQuantity: exicutedQuantity };
            }
            this.asks.push(order);
            return { fills, executedQuantity: exicutedQuantity };
        }
    }
    matchBids(order) {
        const fills = [];
        let exicutedQuantity = 0;
        this.asks.sort((a, b) => a.price - b.price);
        for (let i = 0; i < this.asks.length; i++) {
            const ask = this.asks[i];
            if (!ask)
                continue;
            const remainingOrderQty = order.quantity - order.filled;
            const remainingAskQty = ask.quantity - ask.filled;
            if (remainingOrderQty <= 0)
                break;
            if (remainingAskQty <= 0)
                continue;
            if (order.price < ask.price)
                break;
            const tradeQty = Math.min(remainingOrderQty, remainingAskQty);
            order.filled += tradeQty;
            ask.filled += tradeQty;
            exicutedQuantity += tradeQty;
            fills.push({
                price: ask.price,
                quantity: tradeQty,
                tradeId: (this.lastTradeId++).toString(),
                otherUserId: ask.userId,
                markerOrderId: ask.orderId
            });
            if (ask.filled === ask.quantity) {
                this.asks.splice(i, 1);
                i--;
            }
        }
        return { fills, executedQuantity: exicutedQuantity };
    }
    matchAsks(order) {
        const fills = [];
        let exicutedQty = 0;
        this.bits.sort((a, b) => b.price - a.price);
        for (let i = 0; i < this.bits.length; i++) {
            const bid = this.bits[i];
            if (!bid)
                continue;
            const remainingOrderQty = order.quantity - order.filled;
            const remainingBidQty = bid.quantity - bid.filled;
            if (remainingOrderQty <= 0)
                break;
            if (remainingBidQty <= 0)
                continue;
            if (order.price > bid.price)
                break;
            const tradeQty = Math.min(remainingOrderQty, remainingBidQty);
            order.filled += tradeQty;
            bid.filled += tradeQty;
            exicutedQty += tradeQty;
            fills.push({
                price: bid.price,
                quantity: tradeQty,
                tradeId: (this.lastTradeId++).toString(),
                otherUserId: bid.userId,
                markerOrderId: bid.orderId
            });
            if (bid.filled === bid.quantity) {
                this.bits.splice(i, 1);
                i--;
            }
        }
        return { fills, exicutedQuantity: exicutedQty };
    }
    getDepth() {
        const bids = this.bits.slice(0, 10)
            .map(bid => [bid.price.toString(), (bid.quantity - bid.filled).toString()]);
        const asks = this.asks.slice(0, 10)
            .map(ask => [ask.price.toString(), (ask.quantity - ask.filled).toString()]);
        const bidsObj = {};
        const asksObj = {};
        for (const b of this.bits) {
            bidsObj[b.price] = (bidsObj[b.price] || 0) + b.quantity;
        }
        for (const a of this.asks) {
            asksObj[a.price] = (asksObj[a.price] || 0) + a.quantity;
        }
        for (const price in bidsObj) {
            bids.push([price, (bidsObj[price] ?? 0).toString()]);
        }
        for (const price in asksObj) {
            asks.push([price, (asksObj[price] ?? 0).toString()]);
        }
        return { bids, asks };
    }
    getOpenOrders(userId) {
        const bids = this.bits.filter(bit => bit.userId === userId);
        const asks = this.asks.filter(ask => ask.userId === userId);
        return [...bids, ...asks];
    }
}
//# sourceMappingURL=orderBook.js.map