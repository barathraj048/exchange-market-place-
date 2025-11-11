import { BASE_CURRENCY } from "./engine";

export interface order{
   userId:string
   quortAssert:string,
   price:number,
   quantity:number,
   side:"BUY" | "SELL"
   orderId:string
   filled:number
}
export interface fills{
   price:number,
   quantity:number,
   tradeId:string,
   otherUserId:string,
   markerOrderId:string
}

export class orderBook{
   bits:order[]=[]
   asks:order[]=[]
   base_asset:string
   quote_asset:string=BASE_CURRENCY
   currentPrice:number   
   lastTradeId:number

   constructor(bids:order[],asks:order[],base_assert:string,currentPrice:number,lastTradeId:number){
      this.bits=bids
      this.asks=asks
      this.base_asset=base_assert
      this.currentPrice=currentPrice || 0
      this.lastTradeId=lastTradeId
   }

   
    getSnapshot() {
        return {
            baseAsset: this.base_asset,
            bids: this.bits,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        }
      }

   addOrder(order: order): {
      fills: fills[],
      executedQuantity: number
      } {
      if (order.side === "BUY") {
         let { fills, executedQuantity } = this.matchBids(order);
         order.filled += executedQuantity;
         if (executedQuantity == order.quantity) {
            return {
            fills,
            executedQuantity
            };
         }
         this.bits.push(order)
         return{
            fills,
            executedQuantity
         }
      }else{
         const {fills,exicutedQuantity}=this.matchAsks(order)
         order.filled += exicutedQuantity;
         if (exicutedQuantity == order.quantity) {
            return {
            fills,
            executedQuantity: exicutedQuantity
            };
         }
         this.asks.push(order)
         return{
            fills,
            executedQuantity: exicutedQuantity
         }
      }
   }
   matchBids(order:order):{
      fills:fills[]
      executedQuantity:number
   }{
      let fills:fills[]=[]
      let exicutedQuantity=0
      for(let i=0;i<this.asks.length;i++){
         let remainingQuantity=order.quantity-order.filled
         let remainingAsksQuantity=this.asks[i].quantity - this.asks[i].filled
         if(order.price >= this.asks[i].price && remainingAsksQuantity>0 && remainingQuantity>0){
            let tradeQty=Math.min(remainingQuantity,remainingAsksQuantity)
            order.filled += tradeQty
            exicutedQuantity += tradeQty
            this.asks[i].filled += tradeQty

            fills.push({
               price:this.asks[i].price,
               quantity:tradeQty,
               tradeId:(this.lastTradeId++).toString(),
               otherUserId:this.asks[i].userId,
               markerOrderId:this.asks[i].orderId
            })
            if(this.asks[i].filled - this.asks[i].quantity ==0){
               this.asks.splice(i,1)
               i--;
            }
         }
      }
      return {
         fills,
         executedQuantity:exicutedQuantity
      }
   }
   matchAsks(order:order):{
      fills:fills[]
      exicutedQuantity:number
   }{
      let fills:fills[]=[]
      let exicutedQty=0
      for(let i=0;i <this.bits.length;i++){
         let remainingOrderQuantity=order.quantity-order.filled
         let remainingBidsQuantity=this.bits[i].quantity - this.bits[i].filled
         if(order.price <= this.bits[i].price && remainingBidsQuantity>0 && remainingOrderQuantity>0){
            let tradeQty=Math.min(remainingOrderQuantity,remainingBidsQuantity)
            order.filled += tradeQty
            exicutedQty += tradeQty
            this.bits[i].filled += tradeQty
            fills.push({
               price:this.bits[i].price,
               quantity:tradeQty,
               tradeId:(this.lastTradeId+1).toString(),
               otherUserId:this.bits[i].userId,
               markerOrderId:this.bits[i].orderId
            })

            if(this.bits[i].filled - this.bits[i].quantity ==0){
               this.bits.splice(i,1)
               i--;
            }
         }
      }
      return {
         fills,
         exicutedQuantity:exicutedQty
      }
   }
   getDepth(){
      let bids:[string,string][]=this.bits.slice(0,10).map((bid)=> [bid.price.toString(),(bid.quantity - bid.filled).toString()])
      let asks:[string,string][]=this.asks.slice(0,10).map((ask)=> [ask.price.toString(),(ask.quantity - ask.filled).toString()])
      
      let bidsObj:{[key:string]:number}={}
      let asksObj:{[key:string]:number}={}
      for(let i=0;i<this.bits.length;i++){
         let curr=this.bits[i]
         if(!bidsObj[curr.price]){
            bidsObj[curr.price]=0 
         }
         bidsObj[curr.price]+=curr.quantity
      }

      for(let i=0;i<this.asks.length;i++){
         let curr=this.asks[i]
         if(!asksObj[curr.price]){
            asksObj[curr.price]=0 
         }
         asksObj[curr.price]+=curr.quantity
      }

      for(let bid in bidsObj){
         bids.push([bid,bidsObj[bid].toString()])
      }
      for(let ask in asksObj){
         asks.push([ask,asksObj[ask].toString()])
      }

      return {
         bids,
         asks
      }
   }
   getOpenOrders(userId:string):order[]{
      let bids=this.bits.filter((bit)=> bit.userId===userId)
      let asks=this.asks.filter((ask)=> ask.userId===userId)
      return [...bids,...asks]   
   }
}