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
        this.onLeave(ws, id);
        return user;
    }
    onLeave(ws, id) {
        ws.on("close", () => {
            this.User.delete(id);
            SubscriptionManager.getInstance().leaveUser(id);
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