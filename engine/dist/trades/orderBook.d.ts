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
export declare class orderBook {
    bits: order[];
    asks: order[];
    base_asset: string;
    quote_asset: string;
    currentPrice: number;
    lastTradeId: number;
    constructor(bids: order[], asks: order[], base_assert: string, currentPrice: number, lastTradeId: number);
    getSnapshot(): {
        baseAsset: string;
        bids: order[];
        asks: order[];
        lastTradeId: number;
        currentPrice: number;
    };
    addOrder(order: order): {
        fills: fills[];
        executedQuantity: number;
    };
    matchBids(order: order): {
        fills: fills[];
        executedQuantity: number;
    };
    matchAsks(order: order): {
        fills: fills[];
        exicutedQuantity: number;
    };
    getDepth(): {
        bids: [string, string][];
        asks: [string, string][];
    };
    getOpenOrders(userId: string): order[];
}
//# sourceMappingURL=orderBook.d.ts.map