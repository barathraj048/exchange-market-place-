import { createClient } from 'redis';
import {} from './types/to.js';
import {} from './types/index.js';
export class RedisManager {
    client;
    publisher;
    static instance;
    constructor() {
        this.client = createClient();
        this.client.connect();
        this.publisher = createClient();
        this.publisher.connect();
    }
    static getInstances() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }
    sendAndAwait(message) {
        return new Promise((resolve) => {
            const id = this.getRandomClientId();
            this.client.subscribe(id, (message) => {
                this.client.unsubscribe(id);
                resolve(JSON.parse(message));
            });
            this.publisher.rPush("message", JSON.stringify({ clientId: id, message }));
        });
    }
    getRandomClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
//# sourceMappingURL=RedisManager.js.map