import type { order } from "../trades/orderBook.js";
export type MessageToApi = {
    type: "DEPTH";
    payload: {
        market: string;
        bids: [string, string][];
        asks: [string, string][];
    };
} | {
    type: "ORDER_PLACED";
    payload: {
        orderId: string;
        executedQty: number;
        fills: {
            price: string;
            qty: number;
            tradeId: number;
        }[];
    };
} | {
    type: "ORDER_CANCELLED";
    payload: {
        orderId: string;
        executedQty: number;
        remainingQty: number;
    };
} | {
    type: "OPEN_ORDERS";
    payload: order[];
};
//# sourceMappingURL=toAPi.d.ts.map