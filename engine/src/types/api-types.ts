export const CREATE_ORDER = "CREATE_ORDER"; // Fixed casing to match Engine imports
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const GET_DEPTH = "GET_DEPTH";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";

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
        market: string; // example: "BTC_USDT"
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
    };
