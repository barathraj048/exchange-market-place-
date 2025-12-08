import WebSocket from 'ws'
export class User {
   private ws: WebSocket
   private id: string

   constructor(ws: WebSocket,id: string) {
      this.ws = ws
      this.id = id
   }
   edmit(message: any) {
      this.ws.send(JSON.stringify(message))
   }
}