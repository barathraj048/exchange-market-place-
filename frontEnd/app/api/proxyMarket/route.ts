import { NextResponse } from "next/server";

const SUPPORTED_MARKETS = new Set(["BTC_USDC", "ETH_USDC", "SOL_USDC", "BNB_USDC", "XRP_USDC"]);

export async function GET() {
  const uri = "https://api.backpack.exchange/api/v1/markets";

  try {
    const res = await fetch(uri, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstream API Error: ${res.status}`);
    }

    const data = await res.json();
    
    // Maintain identical scheme but truncate arrays to supported premium pairs
    const filteredMarkets = data.filter((market: any) => 
      SUPPORTED_MARKETS.has(market.symbol)
    );

    return NextResponse.json(filteredMarkets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}