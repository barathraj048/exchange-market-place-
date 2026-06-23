"use client"
import React, { useEffect, useState } from 'react'
import { SignalingManager } from '../utils/SignalingManager'

export function Trades({ market }: { market: string }) {
   const [prices, setPrices] = useState<string[]>([])
   const [quantities, setQuantities] = useState<string[]>([])
   const [times, setTimes] = useState<string[]>([])
   const [isBuyerMaker, setIsBuyerMaker] = useState<boolean[]>([])
   const [isLoading, setIsLoading] = useState(true)

   // Load historical trades on mount
   useEffect(() => {
      const loadHistoricalTrades = async () => {
         try {
            setIsLoading(true)
            
            // FIX: Pointing to your local Next.js API proxy instead of Backpack's public REST endpoint
            const response = await fetch(`/api/trades?symbol=${market}&limit=20`)
            
            if (response.ok) {
               const trades = await response.json()
               
               // Reverse chronological order adjustment if needed based on engine response layout
               const reversedTrades = [...trades].reverse()
               
               setPrices(reversedTrades.map((t: any) => t.price))
               setQuantities(reversedTrades.map((t: any) => t.quantity))
               setTimes(reversedTrades.map((t: any) => 
                  new Date(parseInt(t.timestamp || t.t)).toLocaleTimeString()
               ))
               // Fallback checks depending on how your Express engine maps transaction sides
               setIsBuyerMaker(reversedTrades.map((t: any) => t.side === 'Bid' || t.isBuyerMaker === true))
            }
         } catch (err) {
            console.error("Error loading historical trades from local engine:", err)
         } finally {
            setIsLoading(false)
         }
      }
      
      loadHistoricalTrades()
   }, [market])

   // Subscribe to real-time public feeds directly from Backpack for live UI updates
   useEffect(() => {
      if (isLoading) return 
      
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
   }, [market, isLoading])

   return (
      <div className='w-full'>
         <div className='flex justify-between text-xs text-slate-400 pb-2 border-b border-slate-800 font-medium'>
            <div className='flex-1 text-left'>Price</div>
            <div className='flex-1 text-right'>Qty</div>
            <div className='flex-1 text-right'>Time</div>
         </div>
         
         <div className='text-sm font-mono'>
            {isLoading ? (
               <div className='text-slate-500 text-center py-4 animate-pulse text-xs'>
                  Loading market history...
               </div>
            ) : prices.length === 0 ? (
               <div className='text-slate-500 text-center py-4 text-xs'>No trades executed...</div>
            ) : (
               prices.map((price, index) => (
                  <div 
                     key={`${price}-${times[index]}-${index}`} 
                     className='flex justify-between py-1 hover:bg-slate-800/40 transition-colors'
                  >
                     <div className={`flex-1 text-left ${isBuyerMaker[index] ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(price).toFixed(4)}
                     </div>
                     <div className="flex-1 text-right text-gray-200">{parseFloat(quantities[index]).toFixed(4)}</div>
                     <div className="flex-1 text-right text-slate-500 text-xs flex items-center justify-end">{times[index]}</div>
                  </div>
               ))
            )}
         </div>
      </div>
   )
}