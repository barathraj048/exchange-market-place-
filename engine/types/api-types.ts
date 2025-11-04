export const CreateOrder="CREATE_ORDER"
export const CancelOrder="CANCEL_ORDER"
export const onRamp="ON_RAMP"
export const getDepth="GET_DEPTH"
export const getOpenOrders="GET_OPEN_ORDERS"

export interface MessageFromApi{
   type: typeof CreateOrder,
   data:{
      userId:string,
      price:number,
      quantity:number,
      side:"BUY" | "SELL",
      market:string
   } | {
   type: typeof CancelOrder,
   data:{
      orderId:string
      market:string
   } } | {
   type: typeof onRamp,
   data:{
      amount:number,
      txnid:string,
      userId:string
   }
   }  | {
   type: typeof getDepth,
   data:{
      market:string
   }
   } | {
   type: typeof getOpenOrders,
   data:{
      market:string
      userId:string
   }}
}