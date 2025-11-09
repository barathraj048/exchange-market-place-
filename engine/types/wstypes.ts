export type TradeAddedMessage = {
    stream: string,
    data: {
        e: "trade",
        t: number,
        m: boolean,
        p: string,
        q: string,
        s: string, 
    }
}
export type addDepth ={
      stream: string,
      data:{
         e:"depth"
         a?:[string,string][],
         b?:[string,string][],
      }
}
export type wsMessage=TradeAddedMessage | addDepth