"use client"
import React, { useEffect, useState } from 'react'
import { SignalingManager } from '../utils/SignalingManager'

export function Trades({market}:{market:string}) {
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
            
            // Fetch last 20 trades from Backpack API
            const response = await fetch(
               `https://api.backpack.exchange/api/v1/trades?symbol=${market}&limit=20`
            )
            
            if (response.ok) {
               const trades = await response.json()
               
               // Backpack returns trades in chronological order, reverse to show newest first
               const reversedTrades = [...trades].reverse()
               
               setPrices(reversedTrades.map((t: any) => t.price))
               setQuantities(reversedTrades.map((t: any) => t.quantity))
               setTimes(reversedTrades.map((t: any) => 
                  new Date(parseInt(t.timestamp)).toLocaleTimeString()
               ))
               // Backpack uses 'm' for maker (sell) and 't' for taker (buy)
               setIsBuyerMaker(reversedTrades.map((t: any) => t.side === 'Bid'))
            }
         } catch (err) {
            console.error("Error loading historical trades:", err)
         } finally {
            setIsLoading(false)
         }
      }
      
      loadHistoricalTrades()
   }, [market])

   // Subscribe to real-time trades
   useEffect(() => {
      if (isLoading) return // Wait for historical data to load first
      
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
         {/* Header Row */}
         <div className='flex justify-between text-xs text-slate-400 pb-2 border-b border-slate-800'>
            <div className='flex-1 text-left'>Price</div>
            <div className='flex-1 text-right'>Qty</div>
            <div className='flex-1 text-right'>Time</div>
         </div>
         
         {/* Data Rows */}
         <div className='text-sm'>
            {isLoading ? (
               <div className='text-slate-500 text-center py-4 animate-pulse'>
                  Loading trades...
               </div>
            ) : prices.length === 0 ? (
               <div className='text-slate-500 text-center py-4'>No trades yet...</div>
            ) : (
               prices.map((price, index) => (
                  <div 
                     key={`${price}-${times[index]}-${index}`} 
                     className={`flex justify-between py-1 hover:bg-slate-800/50 transition-colors`}
                  >
                     <div className={`flex-1 text-left ${isBuyerMaker[index] ? 'text-green-400' : 'text-red-400'}`}>
                        {price}
                     </div>
                     <div className="flex-1 text-right text-gray-50">{quantities[index]}</div>
                     <div className="flex-1 text-right text-slate-400">{times[index]}</div>
                  </div>
               ))
            )}
         </div>
      </div>
   )
}