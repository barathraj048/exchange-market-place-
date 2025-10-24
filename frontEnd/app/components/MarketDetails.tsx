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

function MarketDetails() {
  const [loading, setLoading] = useState(true);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const data = await getTickers();
        const sorted = data.sort(
          (a, b) => parseFloat(b.trades) - parseFloat(a.trades)
        );
        setTickers(sorted.slice(0,5));
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
          priceChange,
          priceChangePercent,
          volume,
          quoteVolume,
        } = t;

        const [baseSymbol, quoteSymbol] = symbol.split("_");
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
                  e.currentTarget.src = "/default.svg"; 
                }}
              />
              <span className="font-medium">
                {baseSymbol}/{quoteSymbol}
              </span>
            </div>

            <p className="w-1/5 text-right">{parseFloat(lastPrice).toFixed(4)}</p>
            <p className="w-1/5 text-right">{parseFloat(volume).toFixed(2)}</p>
            <p className="w-1/5 text-right">{parseFloat(quoteVolume).toFixed(2)}</p>
            <p
              className={`w-1/5 text-right ${
                parseFloat(priceChange) > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {parseFloat(priceChange).toFixed(2)} (
              {(parseFloat(priceChangePercent) * 100).toFixed(2)}%)
            </p>
          </div>
        );
      })}
    </div>
  );
}
export default MarketDetails;