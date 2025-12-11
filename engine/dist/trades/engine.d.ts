import { type MessageFromApi } from "../types/api-types.js";
export declare const BASE_CURRENCY = "INR";
import { type order, type fills } from "./orderBook.js";
export declare class Engine {
    private orderBook;
    private balances;
    private snapshotPath;
    constructor();
    saveSnapshot(): void;
    process({ message, ClientId }: {
        message: MessageFromApi;
        ClientId: string;
    }): void;
    onRamp(ClientId: string, amount: number): void;
    updateDepth(maker: string, orderId: string, price: number): void;
    createOrder(quantity: number, price: number, side: "BUY" | "SELL", market: string, ClientId: string): {
        executedQty: number;
        fills: fills[];
        orderId: string;
    };
    publishWsDepth(side: "BUY" | "SELL", market: string, price: number, fills: fills[]): void;
    publishWsTrades(fills: fills[], market: string, side: "BUY" | "SELL"): void;
    createDbOrder(order: order, fills: fills[], executedQuantity: number, market: string): void;
    createDbTrade(fills: fills[], market: string, side: "BUY" | "SELL"): void;
    updateBalances(ClientId: string, executedQuantity: number, fills: fills[], base_assert: string, quote_assert: string, side: "BUY" | "SELL"): void;
    checkAndLock(quantity: number, price: number, side: "BUY" | "SELL", base_assert: string, quote_assert: string, ClientId: string): void;
    setBaseBalances(): void;
}
//# sourceMappingURL=engine.d.ts.map