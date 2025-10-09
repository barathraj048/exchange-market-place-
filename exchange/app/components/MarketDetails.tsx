"use client";
import React, { useEffect, useState } from "react";

interface Market {
  symbol: string;
  baseSymbol: string;
  quoteSymbol: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  change24h?: number;
}

function MarketDetails() {
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch("https://your-api.com/api/v1/markets");
        const data = await res.json();
        setMarkets(data.slice(0, 20)); // first 20 markets
        console.log(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      {markets.map((mkt) => (
        <div
          key={mkt.symbol}
          className="flex justify-between text-gray-400 mb-4 w-full px-4"
        >
          <p className="w-1/5">
            {mkt.baseSymbol}/{mkt.quoteSymbol}
          </p>
          <p className="w-1/5 text-right">{mkt.price ?? "—"}</p>
          <p className="w-1/5 text-right">{mkt.volume24h ?? "—"}</p>
          <p className="w-1/5 text-right">{mkt.marketCap ?? "—"}</p>
          <p
            className={`w-1/5 text-right ${
              (mkt.change24h ?? 0) > 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {mkt.change24h ?? "—"}%
          </p>
        </div>
      ))}
    </div>
  );
}

export default MarketDetails;
