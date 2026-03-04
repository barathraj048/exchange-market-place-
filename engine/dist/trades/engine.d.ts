import { type MessageFromApi } from "../types/api-types.js";
export declare const BASE_CURRENCY = "INR";
import { type order, type fills } from "./orderBook.js";
interface UserBalance {
    [key: string]: {
        available: number;
        locked: number;
    };
}
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
    offRamp(ClientId: string, amount: number, asset: string): void;
    updateDepth(market: string, orderId: string, price: number): void;
    createOrder(quantity: number, price: number, side: "BUY" | "SELL", market: string, ClientId: string): {
        executedQty: number;
        fills: fills[];
        orderId: string;
    };
    publishWsDepth(side: "BUY" | "SELL", market: string, price: number, fills: fills[]): void;
    publishWsTrades(fills: fills[], market: string, side: "BUY" | "SELL"): void;
    createDbOrder(order: order, fills: fills[], executedQuantity: number, market: string): void;
    createDbTrade(fills: fills[], market: string, side: "BUY" | "SELL"): void;
    updateBalances(ClientId: string, executedQuantity: number, fills: fills[], base_asset: string, quote_asset: string, side: "BUY" | "SELL"): void;
    checkAndLock(quantity: number, price: number, side: "BUY" | "SELL", base_asset: string, quote_asset: string, ClientId: string): void;
    setBaseBalances(): void;
    getBalances(ClientId: string): UserBalance;
}
export {};
//# sourceMappingURL=engine.d.ts.map