export declare class SubscriptionManager {
    private static instance;
    private subscription;
    private reverseSubscription;
    private redisClient;
    private constructor();
    static getInstance(): SubscriptionManager;
    subscribeChannel(id: string, channel: string): void;
    private redisCallbackHandler;
    unsubscribeChannel(id: string, channel: string): void;
    leaveUser(id: string): void;
    userLeft(id: string): void;
    getSubscription(id: string): string[];
}
//# sourceMappingURL=subscriotionManager.d.ts.map