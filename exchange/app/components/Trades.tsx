"use client"
import React, { useEffect, useState } from 'react'
import { SignalingManager } from '../utils/SignalingManager'

export function Trades({market}:{market:string}) {
   const [prices, setPrices] = useState<string[]>([])
   const [quantities, setQuantities] = useState<string[]>([])
   const [times, setTimes] = useState<string[]>([])
   const [isBuyerMaker, setIsBuyerMaker] = useState<boolean[]>([])

   useEffect(() => {
      const type = "trade"
      const id = `trade-${market}`
      
      const callback = (data: any) => {
         setPrices((prevPrices) => [data.price, ...prevPrices].slice(0, 20))
         setQuantities((prevQuantities) => [data.quantity, ...prevQuantities].slice(0, 20))
         setTimes((prevTimes) => [
            new Date(data.timestamp).toLocaleTimeString(), 
            ...prevTimes
         ].slice(0, 20)) 
         setIsBuyerMaker((prevIsBuyerMaker) => [data.isBuyerMaker, ...prevIsBuyerMaker].slice(0, 20))
      }
      
      SignalingManager.getInstance().registerCallback(type, callback, id);
      SignalingManager.getInstance().sendMessage({
         method: "SUBSCRIBE",
         params: [`trade.${market}`]
      })

      return () => {
         SignalingManager.getInstance().sendMessage({
            method: "UNSUBSCRIBE",
            params: [`trade.${market}`]
         })
         SignalingManager.getInstance().deRegisterCallback(type, id);
      }
   }, [market])

   return (
      <div className='w-full'>
         {/* Header Row */}
         <div className='flex justify-between text-xs text-slate-400 pb-2 border-b border-slate-800'>
            <div className='flex-1 text-left'>Price</div>
            <div className='flex-1 text-right'>Qty</div>
            <div className='flex-1 text-right'>Time</div>
         </div>
         
         {/* Data Rows */}
         <div className='text-sm'>
            {prices.length === 0 ? (
               <div className='text-slate-500 text-center py-4'>No trades yet...</div>
            ) : (
               prices.map((price, index) => (
                  <div 
                     key={index} 
                     className={`flex justify-between py-1 hover:bg-slate-800/50 transition-colors 
                        ${isBuyerMaker[index] ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                     >
                     <div className="flex-1 text-left">{price}</div>
                     <div className="flex-1 text-right text-gray-50">{quantities[index]}</div>
                     <div className="flex-1 text-right text-slate-400">{times[index]}</div>
                     </div>
               ))
            )}
         </div>
      </div>
   )
}