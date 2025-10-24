import React from 'react'
import { Depth as DepthView} from "@/app/components/depth/Depth";
import {Trades as TradeView} from './Trades';

function Info({market}:{market:string}) {
   const [activeTab, setActiveTab] = React.useState('depth');
  return (
      <div>
          <div className="flex flex-row border-b border-slate-800">
            <Depth activeTab={activeTab} setActiveTab={setActiveTab}/>
            <Trades activeTab={activeTab} setActiveTab={setActiveTab}/>
         </div>
         <div>
            {activeTab=="depth" ? <DepthView market={market as string} /> :<TradeView market={market}/>}
         </div>
      </div>
  )
}

export default Info


function Depth({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: any }) {
    return <div className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 ${activeTab === 'depth' ? 'border-b-white bg-gray-800' : 'border-b-gray-900 hover:border-b-baseBorderFocus'}`} onClick={() => setActiveTab('depth')}>
        <p className="text-center text-sm font-semibold text-greenText">
            Depth
        </p>
    </div>
}

function Trades({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: any }) {
    return <div className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 ${activeTab === 'trade' ? 'border-b-white bg-gray-800' : 'border-b-gray-900 hover:border-b-baseBorderFocus'}`} onClick={() => setActiveTab('trade')}>
        <p className="text-center text-sm font-semibold text-redText">
            Trades
        </p>
    </div>}