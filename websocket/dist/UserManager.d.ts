import { User } from './User.js';
import WebSocket from 'ws';
export declare class UserManager {
    private static instance;
    private User;
    static getInstance(): UserManager;
    constructor();
    addUser(ws: WebSocket): User;
    private registerListeners;
    getUser(id: string): User;
    private idGenerator;
}
//# sourceMappingURL=UserManager.d.ts.map