"use client";

import { useEffect, useState } from "react";
// import { getDepth, getKlines, getTicker, getTrades } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { SignalingManager } from "@/app/utils/SignalingManager";

export function Depth({ market }: {market: string}) {
    const [bids, setBids] = useState<[string, string][]>();
    const [asks, setAsks] = useState<[string, string][]>();
    const [currprice, setPrice] = useState<string>();

useEffect(() => {
    const callback = (data: any) => {
        setBids((originalBids) => {
            const bidsAfterUpdate = [...(originalBids || [])];
            if (bidsAfterUpdate.length === 0 && data.bids) {
                return data.bids;
            }
            
            if (data?.bids && Array.isArray(data.bids)) {
                for (let j = 0; j < data.bids.length; j++) {
                    const [price, quantity] = data.bids[j];
                    const existingIndex = bidsAfterUpdate.findIndex(bid => bid[0] === price);
                    
                    if (existingIndex !== -1) {
                        if (parseFloat(quantity) === 0) {
                            bidsAfterUpdate.splice(existingIndex, 1);
                        } else {
                            bidsAfterUpdate[existingIndex][1] = quantity;
                        }
                    } else if (parseFloat(quantity) > 0) {
                        bidsAfterUpdate.push([price, quantity]);
                    }
                }
            }
            
            return bidsAfterUpdate;
        });

        setAsks((originalAsks) => {
            const asksAfterUpdate = [...(originalAsks || [])];
            if (asksAfterUpdate.length === 0 && data.asks) {
                return data.asks;
            }
            
            if (data?.asks && Array.isArray(data.asks)) {
                for (let j = 0; j < data.asks.length; j++) {
                    const [price, quantity] = data.asks[j];
                    const existingIndex = asksAfterUpdate.findIndex(ask => ask[0] === price);
                    
                    if (existingIndex !== -1) {
                        if (parseFloat(quantity) === 0) {
                            asksAfterUpdate.splice(existingIndex, 1);
                        } else {
                            asksAfterUpdate[existingIndex][1] = quantity;
                        }
                    } else if (parseFloat(quantity) > 0) {
                        asksAfterUpdate.push([price, quantity]);
                    }
                }
            }
            
            return asksAfterUpdate;
        });
    };
    const type= "depth"
    const id = `DEPTH-${market}`;
    SignalingManager.getInstance().registerCallback(type, callback, id);
    SignalingManager.getInstance().registerCallback("ticker",(data:any)=> {
        setPrice(data?.lastPrice)},`ticker-${market}`)
    SignalingManager.getInstance().sendMessage({"method":"SUBSCRIBE","params":[`depth.${market}`]});
    SignalingManager.getInstance().sendMessage({"method":"SUBSCRIBE","params":[`ticker.${market}`]});

    return () => {
        SignalingManager.getInstance().sendMessage({"method":"UNSUBSCRIBE","params":[`depth.200ms.${market}`]});
        SignalingManager.getInstance().deRegisterCallback("depth", `DEPTH-${market}`);
                SignalingManager.getInstance().sendMessage({"method":"UNSUBSCRIBE","ticker":[`ticker.200ms.${market}`]});
        SignalingManager.getInstance().deRegisterCallback("ticker", `ticker-${market}`);
    };
}, [market]);
    return <div>
        <TableHeader />
        {asks && <AskTable asks={asks} />}
        {currprice && <div className="p-1">{currprice} LastExchange</div>}
        {bids && <BidTable bids={bids} />}
    </div>
}

function TableHeader() {
    return <div className="flex justify-between text-xs">
    <div className="text-white">Price</div>
    <div className="text-slate-500">Size</div>
    <div className="text-slate-500">Total</div>
</div>
}