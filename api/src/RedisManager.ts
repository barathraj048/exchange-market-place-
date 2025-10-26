import {createClient, RedisClientType} from 'redis'

export class ResisManaget{
   private client:RedisClientType
   private publisher:RedisClientType
   private static instance:ResisManaget

   constructor(){
      this.client=createClient()
      this.client.connect()
      this.publisher=createClient()
      this.publisher.connect()
   }

   static getInstances(){  
      if(!this.instance){
         this.instance=new ResisManaget()
      }
      return this.instance
   }

   public sendAndAwait(message:any){
      return new Promise((resolve)=> {
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