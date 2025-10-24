import MarketHeader from "../components/MarketsHeader";
import MarketDetails from "../components/MarketDetails";
export default function Page() {
    return (
    <div className="flex flex-row flex-1">
        <div className="bg-[#14151b] p-8 m-8 w-full">
            <MarketHeader/>
            <MarketDetails/>
        </div>
    </div>)
}