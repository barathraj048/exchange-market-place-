import {WebSocketServer } from 'ws';
import { UserManager } from './UserManager.js';

let wss =new WebSocketServer()

wss.on("connection",(ws)=> {
   UserManager.getInstance().addUser(ws)
})