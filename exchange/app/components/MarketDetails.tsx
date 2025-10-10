"use client";
import React, { useEffect, useState } from "react";
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

function MarketDetails() {
  const [loading, setLoading] = useState(true);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const router = useRouter(); // Next.js router

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const data = await getTickers();

        // sort by quoteVolume descending
        const sorted = data.sort(
          (a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)
        );

        setTickers(sorted.slice(0, 20));
      } catch (err) {
        console.error("Error fetching tickers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      {tickers.map((t) => {
        const {
          symbol,
          lastPrice,
          high,
          low,
          priceChange,
          priceChangePercent,
          volume,
          quoteVolume,
        } = t;

        const [baseSymbol, quoteSymbol] = symbol.split("_");

        return (
          <div
            key={symbol}
            onClick={() => router.push(`/trade/${symbol}`)}
            className="flex justify-between text-gray-400 pt-4 w-full px-4 border-b border-gray-700 pb-2 cursor-pointer hover:bg-gray-800 transition"
          >
            <p className="w-1/5">{baseSymbol}/{quoteSymbol}</p>
            <p className="w-1/5 text-right">{parseFloat(lastPrice).toFixed(4)}</p>
            <p className="w-1/5 text-right">{parseFloat(volume).toFixed(2)}</p>
            <p className="w-1/5 text-right">{parseFloat(quoteVolume).toFixed(2)}</p>
            <p
              className={`w-1/5 text-right ${
                parseFloat(priceChange) > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {parseFloat(priceChange).toFixed(4)} ({(parseFloat(priceChangePercent)*100).toFixed(2)}%)
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default MarketDetails;
