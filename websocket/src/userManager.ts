import { SubscriptionManager } from './subscriotionManager.js'
import { User } from './User.js'
import WebSocket from 'ws'

export class UserManager{
   private static instance:UserManager
   private User:Map<string,User>

   public static getInstance():UserManager{
      if(!UserManager.instance){
         UserManager.instance=new UserManager()
      }
      return UserManager.instance
   }

   constructor(){
      this.User=new Map()
   }

   addUser(ws:WebSocket){
      let id =this.idGenerator()
      let user=new User(ws,id)
      this.User.set(id,user)
      this.onLeave(ws,id)
      return user
   }

   onLeave(ws:WebSocket,id:string){
      ws.on("close",()=>{
         this.User.delete(id)
         SubscriptionManager.getInstance().leaveUser(id)
      })
   }
   getUser(id:string):User {
      return this.User.get(id)!
   }

   private idGenerator():string {
      return Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15)
   }
}