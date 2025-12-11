import { type MessageToEngine } from './types/to.js';
import { type MessageFromOrderbook } from './types/index.js';
export declare class RedisManager {
    private client;
    private publisher;
    private static instance;
    constructor();
    static getInstances(): RedisManager;
    sendAndAwait(message: MessageToEngine): Promise<MessageFromOrderbook>;
    getRandomClientId(): string;
}
//# sourceMappingURL=RedisManager.d.ts.map