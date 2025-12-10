import type { RedisClientType } from "redis";
import { createClient } from "redis";
import { UserManager } from "./UserManager.js";

export class SubscriptionManager {
    private static instance: SubscriptionManager;

    private subscription: Map<string, string[]> = new Map();
    private reverseSubscription: Map<string, string[]> = new Map();

    private redisClient: RedisClientType;

    private constructor() {
        this.redisClient = createClient();
        this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribeChannel(id: string, channel: string) {
        if (this.subscription.get(id)?.includes(channel)) return;
        this.subscription.set(
            id,
            (this.subscription.get(id) || []).concat(channel)
        );
        this.reverseSubscription.set(
            channel,
            (this.reverseSubscription.get(channel) || []).concat(id)
        );
        if ((this.reverseSubscription.get(channel)?.length || 0) === 1) {
            this.redisClient.subscribe(channel, (msg, chan) =>
                this.redisCallbackHandler(msg, chan)
            );
        }
    }

    private redisCallbackHandler(message: string, channel: string) {
        const parsed = JSON.parse(message);

        const users = this.reverseSubscription.get(channel);
        if (!users) return;
        users.forEach((id) => {
            const user = UserManager.getInstance().getUser(id);
            if (user) user.edmit(parsed);
        });
    }

    public unsubscribeChannel(id: string, channel: string) {
        this.subscription.set(
            id,
            (this.subscription.get(id) || []).filter((c) => c !== channel)
        );
        this.reverseSubscription.set(
            channel,
            (this.reverseSubscription.get(channel) || []).filter((c) => c !== id)
        );
        if ((this.reverseSubscription.get(channel)?.length || 0) === 0) {
            this.reverseSubscription.delete(channel);
            this.redisClient.unsubscribe(channel);
        }
   }

    public leaveUser(id: string) {
      this.subscription.get(id)?.forEach((c)=> this.unsubscribeChannel(id,c))
    }

    public userLeft(id: string) {
        const channels = this.subscription.get(id);
        if (!channels) return;

        channels.forEach((c) => this.unsubscribeChannel(id, c));
        this.subscription.delete(id);
    }

    public getSubscription (id:string){
      return this.subscription.get(id) || []
    }
}
