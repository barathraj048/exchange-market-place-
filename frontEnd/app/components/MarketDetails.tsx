"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getTickers } from "../utils/httpClient";

interface Ticker {
  symbol: string;
  firstPrice: string;
  lastPrice: string;
  high: string;
  low: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  trades: string;
}

// 1. Define the strict list of our 5 chosen markets
const ALLOWED_MARKETS = [
  "BTC_USDC",
  "ETH_USDC",
  "SOL_USDC",
  "BNB_USDC",
  "XRP_USDC",
];

function MarketDetails() {
  const [loading, setLoading] = useState(true);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const data = await getTickers();
        
        // 2. Filter out any test/junk pairs from the DB, strictly keeping our Top 5
        const filteredTickers = data.filter((t: Ticker) => 
          ALLOWED_MARKETS.includes(t.symbol)
        );

        // 3. Sort by volume/trades to keep the most active ones at the top
        const sorted = filteredTickers.sort(
          (a: Ticker, b: Ticker) => parseFloat(b.trades) - parseFloat(a.trades)
        );
        
        setTickers(sorted);
      } catch (err) {
        console.error("Error fetching tickers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
  }, []);

  if (loading) return <div className="text-gray-400 p-4">Loading Market Data...</div>;

  return (
    <div className="w-full">
      {tickers.map((t) => {
        const {
          symbol,
          lastPrice,
          priceChange,
          priceChangePercent,
          volume,
          quoteVolume,
        } = t;

        const [baseSymbol, quoteSymbol] = symbol.split("_");
        // Using your local SVG API wrapper
        const iconUrl = `http://localhost:3000/api/color/${baseSymbol.toLowerCase()}/600`;

        return (
          <div
            key={symbol}
            onClick={() => router.push(`/trade/${symbol}`)}
            className="flex justify-between items-center text-gray-300 pt-4 w-full px-4 border-b border-gray-700 pb-2 cursor-pointer hover:bg-gray-800 transition"
          >
            <div className="w-1/5 flex items-center gap-2">
              <Image
                src={iconUrl}
                alt={baseSymbol}
                width={24}
                height={24}
                className="rounded-full bg-gray-900"
                onError={(e) => {
                  // Fallback if the SVG API fails
                  e.currentTarget.src = "/default.svg"; 
                }}
              />
              <span className="font-medium text-white">
                {baseSymbol}/{quoteSymbol}
              </span>
            </div>

            <p className="w-1/5 text-right font-mono">
              ${parseFloat(lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
            <p className="w-1/5 text-right font-mono hidden md:block">
              {parseFloat(volume).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="w-1/5 text-right font-mono hidden md:block">
              ${parseFloat(quoteVolume).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p
              className={`w-1/5 text-right font-mono font-medium ${
                parseFloat(priceChange) >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {parseFloat(priceChange) >= 0 ? "+" : ""}
              {(parseFloat(priceChangePercent) * 100).toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default MarketDetails;