import WebSocket from 'ws';
export class User {
    ws;
    id;
    constructor(ws, id) {
        this.ws = ws;
        this.id = id;
    }
    edmit(message) {
        this.ws.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=User.js.map