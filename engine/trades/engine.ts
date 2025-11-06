import fs from 'fs';
import { CreateOrder, MessageFromApi } from '../types/api-types';
export const BASE_CURRENCY="INR";
import { orderBook,order } from './orderBook';
interface UserBalance {
   [key:string]:{
      available:number,
      locked:number
   }
}

export class Engine {
   private orderBook :orderBook[]=[] //types whare orderBook is defined in orderBook class
   private balances: Map<string, UserBalance> = new Map();
   
   constructor(){
      let snapShort=null
      try{
         if(process.env.WITH_SNAPSHORT){
            fs.readFileSync("./snapshort.json","utf-8") //utf-8 to read as string  (encoding formate)
         }
      }catch(e){
         console.log("No snapshort found, starting fresh")
      }
      if(snapShort){
         const snapShortsObj=JSON.parse(snapShort)
         this.orderBook=snapShortsObj.orderBook.map((o:any)=> {
            new orderBook(o.bits,o.asks,o.base_asset,o.currentPrice,o.lastTradeId)
         })
         this.balances=new Map(snapShortsObj.balance)
      }else{ 
         this.orderBook=[new orderBook([],[],"tata",0,0)]
         this.setBaseBalances();
      }

      setInterval(()=> {
         this.saveSnapshort()
      },60*1000) 
   }

   saveSnapshort () {
      const snapShortObj={
         orderBook:this.orderBook.map((o)=> {
            o.getSnapshot()
         }),
         balance:Array.from(this.balances.entries())
      }
   }
   process({message,userId}:{message:MessageFromApi,userId:string}) {
      switch(message.type){
         case CreateOrder:{
            let {exicutedQty,fill,price}=this.createOrder(message.data.quantity,message.data.price,message.data.side,message.data.market,userId)
         }
      }
   }
   createOrder(quantity:number,price:number,side:"BUY" | "SELL",market:string,userId:string) {
      let base_assert=market.split("_")[0]
      let quote_assert=market.split("_")[1]
      let orderBook=this.orderBook.find((o)=> o.base_asset===base_assert && o.quote_asset===quote_assert)

      if (!orderBook) console.log("Order book not found for market:", market)
      
      this.checkAndLock(quantity,price,side,base_assert,quote_assert,userId)
      let order:order ={
         quortAssert:quote_assert,
         price,
         quantity,
         side,
         userId,
         filled:0,
         orderId:Math.random().toString(36).substring(2, 15)+ Math.random().toString(36).substring(2, 15)
      }
      let {fills,executedQuantity}=orderBook!.addOrder(order)
   }

   checkAndLock(quantity:number,price:number,side:"BUY" | "SELL",base_assert:string,quote_assert:string,userId:string) {
      if (side==="BUY"){
         if((this.balances.get(userId)?.[quote_assert]?.available || 0)<= Number(price*quantity)){ 
            throw new Error("Insufficient balance")
      }
         this.balances.get(userId)![quote_assert].available -= price*quantity
         this.balances.get(userId)![quote_assert].locked += price*quantity
   }else{
      if((this.balances.get(userId)?.[base_assert]?.available || 0)<= quantity){
         throw new Error("Insufficient balance")
      }
      this.balances.get(userId)![base_assert].available -= quantity
      this.balances.get(userId)![base_assert].locked += quantity
   }
}
   setBaseBalances() {
        this.balances.set("1", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("2", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("5", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });
    }   
   
}