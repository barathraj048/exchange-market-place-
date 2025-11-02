import fs from 'fs';
export const BASE_CURRENCY="INR";
import { orderBook } from './orderBook';
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