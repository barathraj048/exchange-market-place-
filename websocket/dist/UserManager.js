import { SubscriptionManager } from './subscriotionManager.js';
import { User } from './User.js';
import WebSocket from 'ws';
export class UserManager {
    static instance;
    User;
    static getInstance() {
        if (!UserManager.instance) {
            UserManager.instance = new UserManager();
        }
        return UserManager.instance;
    }
    constructor() {
        this.User = new Map();
    }
    addUser(ws) {
        let id = this.idGenerator();
        let user = new User(ws, id);
        this.User.set(id, user);
        this.registerListeners(ws, id);
        return user;
    }
    registerListeners(ws, id) {
        ws.on("message", (raw) => {
            let message;
            try {
                message = JSON.parse(raw.toString());
            }
            catch {
                return;
            }
            const user = this.getUser(id);
            if (!user)
                return;
            switch (message.type) {
                case "AUTH":
                    user.edmit({ type: "AUTH_SUCCESS" });
                    break;
                case "SUBSCRIBE":
                    SubscriptionManager.getInstance().subscribeChannel(id, message.channel);
                    break;
                case "UNSUBSCRIBE":
                    SubscriptionManager.getInstance().unsubscribeChannel(id, message.channel);
                    break;
            }
        });
        ws.on("close", () => {
            this.User.delete(id);
            SubscriptionManager.getInstance().userLeft(id);
        });
    }
    getUser(id) {
        return this.User.get(id);
    }
    idGenerator() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
//# sourceMappingURL=UserManager.js.map