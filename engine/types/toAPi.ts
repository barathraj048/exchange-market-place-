import { order } from "../trades/orderBook";

export type MessageToApi = {
      type: "DEPTH";
      payload: {
        bids: string[];
        asks: string[];
      };
    }
  | {
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
    }
  | {
      type: "ORDER_CANCELED";
      payload: {
        orderId: string;
        executedQuantity: number;
        remainingQuantity: number;
      };
    }
  | {
      type: "OPEN_ORDERS";
      payload: order[];
    };
