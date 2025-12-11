import { createClient } from "redis";
import { UserManager } from "./UserManager.js";
export class SubscriptionManager {
    static instance;
    subscription = new Map();
    reverseSubscription = new Map();
    redisClient;
    constructor() {
        this.redisClient = createClient();
        this.redisClient.connect();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }
    subscribeChannel(id, channel) {
        if (this.subscription.get(id)?.includes(channel))
            return;
        this.subscription.set(id, (this.subscription.get(id) || []).concat(channel));
        this.reverseSubscription.set(channel, (this.reverseSubscription.get(channel) || []).concat(id));
        if ((this.reverseSubscription.get(channel)?.length || 0) === 1) {
            this.redisClient.subscribe(channel, (msg, chan) => this.redisCallbackHandler(msg, chan));
        }
    }
    redisCallbackHandler(message, channel) {
        const parsed = JSON.parse(message);
        const users = this.reverseSubscription.get(channel);
        if (!users)
            return;
        users.forEach((id) => {
            const user = UserManager.getInstance().getUser(id);
            if (user)
                user.edmit(parsed);
        });
    }
    unsubscribeChannel(id, channel) {
        this.subscription.set(id, (this.subscription.get(id) || []).filter((c) => c !== channel));
        this.reverseSubscription.set(channel, (this.reverseSubscription.get(channel) || []).filter((c) => c !== id));
        if ((this.reverseSubscription.get(channel)?.length || 0) === 0) {
            this.reverseSubscription.delete(channel);
            this.redisClient.unsubscribe(channel);
        }
    }
    leaveUser(id) {
        this.subscription.get(id)?.forEach((c) => this.unsubscribeChannel(id, c));
    }
    userLeft(id) {
        const channels = this.subscription.get(id);
        if (!channels)
            return;
        channels.forEach((c) => this.unsubscribeChannel(id, c));
        this.subscription.delete(id);
    }
    getSubscription(id) {
        return this.subscription.get(id) || [];
    }
}
//# sourceMappingURL=subscriotionManager.js.map