import {WebSocketServer } from 'ws';
import { UserManager } from './userManager.js';

let wss =new WebSocketServer()

wss.on("connection",(ws)=> {
   UserManager.getInstance().addUser(ws)
})