import {WebSocketServer } from 'ws';
import { UserManager } from './UserManager.js';

let wss =new WebSocketServer({port:3002})

wss.on("connection",(ws)=> {
   UserManager.getInstance().addUser(ws)
})