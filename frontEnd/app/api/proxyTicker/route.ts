import axios from "axios";
import { NextResponse } from "next/server";

const SUPPORTED_MARKETS = new Set(["BTC_USDC", "ETH_USDC", "SOL_USDC", "BNB_USDC", "XRP_USDC"]);

export async function GET() {
  const uri = "https://api.backpack.exchange/api/v1/tickers";

  try {
    const res = await axios.get(uri);
    
    // Server-side filtration layer
    const filteredTickers = res.data.filter((ticker: any) => 
      SUPPORTED_MARKETS.has(ticker.symbol)
    );

    return NextResponse.json(filteredTickers);
  } catch (error: any) {
    console.error("Error fetching tickers from upstream:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}