import fs from 'fs';
import { CancelOrder, CreateOrder, MessageFromApi } from '../types/api-types';
export const BASE_CURRENCY="INR";
import { orderBook,order, fills } from './orderBook';
import { redisManager } from '../RedisManager';
import { ADD_TRADE, ORDER_UPDATE } from '../types';
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
         case CreateOrder:
            let orderId_send:string
            try{
            let {exicutedQty,fills,orderId}=this.createOrder(message.data.quantity,message.data.price,message.data.side,message.data.market,userId)
            orderId_send=orderId
            redisManager.getInstance().publishToApi(userId,{
               type:"ORDER_PLACED",
               payload:{
                  orderId,
                  exicutedQty,
                  fills
               }
            })
         }catch(e){
            console.log(`Error processing order for user ${userId}:`, e)
            redisManager.getInstance().publishToApi(userId,{
               type:"ORDER_CANCELED",
               payload:{
                  orderId:"",
                  executedQuantity:0,
                  remainingQuantity:0
               }
            })
         }
         break;
         case CancelOrder:
            try{
               let orderId=message.data.orderId
               let base_assert=message.data.market.split("_")[0]
               let quote_assert=message.data.market.split("_")[1]
               let cancelOrderBook=this.orderBook.find((o)=> o.base_asset===base_assert)

               if(!cancelOrderBook) throw new Error("Order book not found")
               let order=cancelOrderBook.asks.find((o)=> o.orderId===orderId) || cancelOrderBook.bits.find((o)=> o.orderId===orderId)
               if(!order) throw new Error("Order not found")
               if(order.side==="BUY"){
                  let balance=(order.quantity-order.filled)*order.price
                  this.balances.get(userId)![quote_assert].locked -= balance
                  this.balances.get(userId)![quote_assert].available += balance
                  this.updateDepth(message.data.market,orderId,balance)
               }else{
                  let balance=(order.quantity-order.filled)*order.price
                  this.balances.get(userId)![base_assert].locked -=balance
                  this.balances.get(userId)![base_assert].available += balance
                  this.updateDepth(message.data.market,orderId,balance)
               }
               redisManager.getInstance().publishToApi(userId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
            }
            catch(e){
               console.log(`Error cancelling order for user ${userId}:`, e)
                
            }break

      }
   }

   updateDepth(maker:string,orderId:string,price:number){
      let orderBook=this.orderBook.find((o)=> o.base_asset===maker)
      if(!orderBook) return
      let depth=orderBook.getDepth()
      let updatedBids=depth.bids.filter((b)=> b[0]==price.toString())
      let updatedAsks=depth.asks.filter((a)=> a[0]==price.toString())

      redisManager.getInstance().publishTrade(`depth@${maker}`, {
         stream: `depth@${maker}`,
         data: {
            e: "depth",
            a: updatedAsks.length ? updatedAsks : [[price.toString(),"0"]],
            b: updatedBids.length ? updatedBids : [[price.toString(),'0']],
         }})
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
      this.updateBalances(userId,executedQuantity,fills,base_assert,quote_assert,side)
      this.createDbTrade(fills,market,side)
      this.createDbOrder(order,fills,executedQuantity,market)
      this.publishWsTrades(fills,market,side)
      this.publishWsDepth(side,market,price,fills)
      return {exicutedQty:executedQuantity,fills,orderId:order.orderId}
   }

  publishWsDepth(side: "BUY" | "SELL", market: string, price: number, fills: fills[]) {
  const orderBook = this.orderBook.find(
    (o) => o.base_asset === market.split("_")[0] && o.quote_asset === market.split("_")[1]
  );
  if (!orderBook) return;
  const depth = orderBook.getDepth();
  if (side === "BUY") {
    const updatedAsks = depth.asks.filter((a) =>
      fills.map((f) => f.price.toString()).includes(a[0])
    );
    const updatedBid = depth.bids.find((b) => b[0] === price.toString());
    redisManager.getInstance().publishTrade(`depth@${market}`, {
      stream: `depth@${market}`,
      data: {
        e: "depth",
        a: updatedAsks,
        b: updatedBid ? [updatedBid] : [],
      },
    });
  } else {
    const updatedAsk = depth.asks.find((a) => a[0] === price.toString());
    const updatedBids = depth.bids.filter((b) =>
      fills.map((f) => f.price.toString()).includes(b[0])
    );
    redisManager.getInstance().publishTrade(`depth@${market}`, {
      stream: `depth@${market}`,
      data: {
        e: "depth",
        a: updatedAsk ? [updatedAsk] : [],
        b: updatedBids,
      },
    });
  }
}

   

   publishWsTrades(fills:fills[],market:string,side:"BUY" | "SELL") {
      fills.forEach((fill)=> {
         redisManager.getInstance().publishTrade(`trade@${market}`,{
            stream:`trade@${market}`,
            data:{
               e:"trade",
               t:Number(fill.tradeId ),
               m:side=="SELL"? true :false,
               p:fill.price.toString(),
               q:fill.quantity.toString(),
               s:market
            }
         })
      })
   }
   createDbOrder(order:order,fills:fills[],executedQuantity:number,market:string) {
      redisManager.getInstance().pushTODb({
         type: ORDER_UPDATE,
         data:{
            orderId:order.orderId,
            executedQuantity:executedQuantity,
            price:order.price,
            quantity:order.quantity,
            market,
            side:order.side
         }
      })

      fills.forEach((fill)=> {
         redisManager.getInstance().pushTODb({
            type: ORDER_UPDATE,
            data:{
               orderId:fill.otherUserId,
               executedQuantity:fill.quantity,
            }
      })})
   }

   createDbTrade(fills:fills[],market:string,side:"BUY" | "SELL") {
      fills.forEach((fill)=> {
         redisManager.getInstance().pushTODb({
            type:ADD_TRADE,
            data:{
               id:fill?.tradeId.toString(),
               price:fill.price,
               quantity:fill.quantity,
               timeStramp:Date.now(),
               isBuyerMaker: side=="SELL"? true :false, //if sell then buyer is maker
               quoteQuantity:(fill.price * fill.quantity).toString(),
               market
            }
      })
      })
   }

   updateBalances(userId:string,executedQuantity:number,fills:fills[],base_assert:string,quote_assert:string,side:"BUY" | "SELL") {
      const userBalance=this.balances.get(userId)
      if(!userBalance) return
      if(side==="BUY"){
         fills.forEach((fill)=> {
            userBalance![base_assert].available += fill.quantity 
            // userBalance![base_assert].locked -= fill.quantity
            // userBalance![quote_assert].available += (fill.quantity*fill.price)
            userBalance![quote_assert].locked -= ( fill.quantity*fill.price)

         })
      }else{
         fills.forEach((fill)=> {
            userBalance![base_assert].locked -=fill.quantity
            userBalance![quote_assert].available += (fill.quantity*fill.price)
            // userBalance![base_assert].available += fill.quantity
            // userBalance![quote_assert].locked -= fill.quantity
         })
      }
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