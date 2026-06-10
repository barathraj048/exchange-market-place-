export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const OFF_RAMP = "OFF_RAMP";
export const GET_BALANCE = "GET_BALANCE";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_DEPTH = "GET_DEPTH";

export type MessageFromOrderbook = {
    type: "DEPTH" | "GET_DEPTH",
    payload: {
        market?: string,
        bids: [string, string][],
        asks: [string, string][],
    }
} | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: number,
        fills: {
            price: number,
            quantity: number,
            tradeId: string,
            otherUserId: string,
            markerOrderId: string
        }[]
    }
} | {
    type: "ORDER_REJECTED",
    payload: {
        orderId: string,
        executedQuantity: number,
        remainingQuantity: number,
        error: string
    }
} | {
    type: "ORDER_CANCELLED",
    payload: {
        orderId: string,
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "ORDER_CANCEL_REJECTED",
    payload: {
        orderId: string,
        error: string
    }
} | {
    type: "OPEN_ORDERS",
    payload: {
        orderId: string,
        price: number,
        quantity: number,
        side: "BUY" | "SELL",
        userId: string,
        filled: number,
        quortAssert: string
    }[]
} | {
    type: "BALANCE_RESPONSE",
    payload: Record<string, { available: number, locked: number }>
} | {
    type: "DEPOSIT_SUCCESS" | "WITHDRAW_SUCCESS",
    payload: {
        amount: number,
        asset?: string,
        currency?: string,
        txnId?: string,
        balance: Record<string, { available: number, locked: number }>
    }
} | {
    type: "DEPOSIT_FAILED" | "WITHDRAW_FAILED",
    payload: {
        error: string
    }
}
