export declare const CREATE_ORDER = "CREATE_ORDER";
export declare const CANCEL_ORDER = "CANCEL_ORDER";
export declare const ON_RAMP = "ON_RAMP";
export declare const GET_DEPTH = "GET_DEPTH";
export declare const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export declare const ADD_TRADE = "ADD_TRADE";
export declare const ORDER_UPDATE = "ORDER_UPDATE";
export type MessageFromApi = {
    type: typeof CREATE_ORDER;
    data: {
        userId: string;
        price: string;
        quantity: string;
        side: "BUY" | "SELL";
        market: string;
    };
} | {
    type: typeof CANCEL_ORDER;
    data: {
        orderId: string;
        market: string;
    };
} | {
    type: typeof ON_RAMP;
    data: {
        amount: string;
        txnId: string;
        userId: string;
    };
} | {
    type: typeof GET_DEPTH;
    data: {
        market: string;
    };
} | {
    type: typeof GET_OPEN_ORDERS;
    data: {
        market: string;
        userId: string;
    };
};
//# sourceMappingURL=api-types.d.ts.map