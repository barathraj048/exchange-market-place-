import WebSocket from 'ws';
export declare class User {
    private ws;
    private id;
    constructor(ws: WebSocket, id: string);
    edmit(message: any): void;
}
//# sourceMappingURL=User.d.ts.map