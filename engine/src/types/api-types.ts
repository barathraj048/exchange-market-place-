// Complete api-types.ts with OFF_RAMP support
export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const OFF_RAMP = "OFF_RAMP";
export const GET_DEPTH = "GET_DEPTH";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_BALANCE = "GET_BALANCE";

export const ADD_TRADE = "ADD_TRADE";
export const ORDER_UPDATE = "ORDER_UPDATE";

export type MessageFromApi =
  | {
      type: typeof CREATE_ORDER;
      data: {
        userId: string;
        price: string;
        quantity: string;
        side: "BUY" | "SELL";
        market: string;
      };
    }
  | {
      type: typeof CANCEL_ORDER;
      data: {
        orderId: string;
        market: string;
      };
    }
  | {
      type: typeof ON_RAMP;
      data: {
        amount: string;
        txnId: string;
        userId: string;
      };
    }
  | {
      type: typeof OFF_RAMP;
      data: {
        amount: string;
        asset: string;
        txnId: string;
        userId: string;
      };
    }
  | {
      type: typeof GET_DEPTH;
      data: {
        market: string;
      };
    }
  | {
      type: typeof GET_OPEN_ORDERS;
      data: {
        market: string;
        userId: string;
      };
    }
  | {
      type: typeof GET_BALANCE;
      data: {
        userId: string;
      };
    };