export declare class RedisManager {
    private client;
    private static instance;
    private constructor();
    static getInstance(): RedisManager;
    pushToDb(data: any): void;
    publishTrade(channel: string, data: any): void;
    publishToApi(clientId: string, data: any): void;
}
export declare const redisManager: RedisManager;
//# sourceMappingURL=RedisManager.d.ts.map