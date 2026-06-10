export type MessageFromEngine =
  {
      type: "ADD_TRADE";
      data: {
        price: number;
        qty: number;
        market: string;
        timestamp: number;
        buyerMarket: boolean;
        id: string;
        quoteQuantity: string;
      };
    }
  | {
      type: "ORDER_UPDATE";
      data: {
        orderId: string;
        executedQuantity: number;
        price?: number;
        quantity?: number;
        market?: string;
        side?: "buy" | "sell";
        orderType?: "LIMIT" | "MARKET";
      };
    };
