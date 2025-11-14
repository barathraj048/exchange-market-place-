   import { createClient, RedisClientType } from "redis"
   import {ADD_TRADE, ORDER_UPDATE} from "./types/index"
import { wsMessage } from "./types/wstypes";
import { MessageToApi } from "./types/toAPi";

type DbMessage =
  {
      type: typeof ADD_TRADE;
      data: {
        id: string;
        price: number;
        quantity: number;
        timeStramp: number;
        isBuyerMaker: boolean;
        quoteQuantity: string;
        market: string;
      };
    }
  | {
      type: typeof ORDER_UPDATE;
      data: {
        orderId: string;
        executedQuantity: number;
        price?: number;
        quantity?: number;
        market?: string;
        side?: "BUY" | "SELL";
      };
    };


   export class redisManager{
      private client:RedisClientType
      private static instance:redisManager
      constructor(){
         this.client=createClient()
         this.client.connect()
      }

      public static getInstance(){
         if(!this.instance){
            this.instance=new redisManager()
         }
         return this.instance
      }

      public pushTODb(data:DbMessage){
         this.client.lPush("db_process",JSON.stringify(data))
      }

      public publishTrade(channel:string,data:wsMessage){
         this.client.publish(channel,JSON.stringify(data))
      }

      public publishToApi(ClientId:string,data:MessageToApi){
         this.client.publish(ClientId,JSON.stringify(data))
      }
   } 