import {createClient, RedisClientType} from 'redis'
import { MessageToEngine } from './types/to'
import { MessageFromOrderbook } from './types'

export class RedisManager{
   private client:RedisClientType
   private publisher:RedisClientType
   private static instance:RedisManager
   
   constructor(){
      this.client=createClient()
      this.client.connect()
      this.publisher=createClient()
      this.publisher.connect()
   }

   static getInstances(){  
      if(!this.instance){
         this.instance=new RedisManager()
      }
      return this.instance
   }

   public sendAndAwait(message:MessageToEngine){
      return new Promise<MessageFromOrderbook>((resolve)=> {
         const id = this.getRandomClientId()
         this.client.subscribe(id,(message)=> {
            this.client.unsubscribe(id)
            resolve(JSON.parse(message))
         })
         this.publisher.rPush("message",JSON.stringify({clientId:id,message}))
      })
   }

   public getRandomClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}