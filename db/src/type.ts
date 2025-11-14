export type MessageFromEngine =
  {
      type: "ADD_TRADE";
      data: {
        price: string;
        qty: string;
        market: string;
        timestamp: number;
        buyerMarket: boolean;
        id: string;
        quoteQuantity: string;
      };
    }
  | {
      type: "ADD_ORDER";
      data: {
        price: string;
        quantity: string;
        market: string;
        side: "buy" | "sell";
        orderId: string;
        executedQuantity: string;
      };
    };
