import { BASE_CURRENCY } from "./engine";

interface order{
   userId:string
   quortAssert:string,
   price:number,
   quantity:number,
   side:"BUY" | "SELL"
   orderId:string
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
}