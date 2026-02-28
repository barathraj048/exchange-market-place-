import { useEffect, useRef, useState } from "react";
import { ChartManager } from "../utils/ChartManager";
import { KLine } from "../utils/types";
import { SignalingManager } from "../utils/SignalingManager";

export function TradeView({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const [klineData, setKlineData] = useState<KLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a consistent interval for both historical and live data!
  const CHART_INTERVAL = "1m"; 

  // Load historical klines
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Backpack API expects seconds for startTime/endTime
        const endTime = Math.floor(Date.now() / 1000);  
        const startTime = endTime - 24 * 60 * 60;

        console.log(`Loading klines from ${new Date(startTime * 1000)} to ${new Date(endTime * 1000)}`);
      
        const response = await fetch(
          `/api/proxy?symbol=${market}&interval=${CHART_INTERVAL}&startTime=${startTime}&endTime=${endTime}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch klines: ${response.statusText}`);
        }

        const klines = await response.json();

        // FIX: Removed parseInt() from start and end. Keep them as the raw ISO strings Backpack provides.
        const formattedKlines: KLine[] = klines.map((k: any) => ({
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
          quoteVolume: k.quoteVolume,
          trades: parseInt(k.trades) || 0,
          start: k.start, 
          end: k.end,
        }));

        setKlineData(formattedKlines);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading historical klines:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      }
    };

    loadHistoricalData();
  }, [market]);

  // Initialize chart with historical data
  useEffect(() => {
    if (!chartRef.current || klineData.length === 0 || isLoading) return;

    // FIX: Parse the ISO string directly into a Date object. (Using 'start' is standard for candles)
    const chartManager = new ChartManager(
      chartRef.current,
      klineData
        .map((x) => ({
          close: parseFloat(x.close),
          high: parseFloat(x.high),
          low: parseFloat(x.low),
          open: parseFloat(x.open),
          timestamp: new Date(x.start), 
        }))
        .sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1)),
      {
        background: "#0e0f14",
        color: "white",
      }
    );

    chartManagerRef.current = chartManager;

    return () => {
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, market]); 

  // Handle Real-time updates
  useEffect(() => {
    if (isLoading || klineData.length === 0) return; 

    const type = "kline";
    const id = `kline-${market}`;

    const callback = (data: KLine) => {
      setKlineData((prevKlines) => {
        const existingIndex = prevKlines.findIndex(
          (k) => k.start === data.start // Better to match by 'start' time
        );

        if (existingIndex !== -1) {
          const updated = [...prevKlines];
          updated[existingIndex] = data;
          return updated;
        } else {
          const updated = [...prevKlines, data];
          const maxCandles = 7 * 24 * 60; // Adjust max candles based on your chosen interval
          return updated.length > maxCandles ? updated.slice(-maxCandles) : updated;
        }
      });

      if (chartManagerRef.current) {
        chartManagerRef.current.update({
          close: parseFloat(data.close),
          high: parseFloat(data.high),
          low: parseFloat(data.low),
          open: parseFloat(data.open),
          timestamp: new Date(data.start), // FIX: Parse ISO string directly
        });
      }
    };

    SignalingManager.getInstance().registerCallback(type, callback, id);
    SignalingManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`kline.${CHART_INTERVAL}.${market}`],
    });

    return () => {
      SignalingManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`kline.${CHART_INTERVAL}.${market}`],
      });
      SignalingManager.getInstance().deRegisterCallback(type, id);
    };
  }, [market, isLoading]);

  if (isLoading) {
    return (
      <div style={{ height: "520px", width: "100%", marginTop: 4 }} className="flex items-center justify-center bg-[#0e0f14]">
        <div className="text-gray-400">
          <div className="animate-pulse">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "520px", width: "100%", marginTop: 4 }} className="flex items-center justify-center bg-[#0e0f14]">
        <div className="text-red-400">
          <div>Error loading chart data</div>
          <div className="text-sm text-gray-500 mt-2">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: "520px", width: "100%", marginTop: 4 }}>
      <div ref={chartRef} style={{ height: "100%", width: "100%" }} />
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-slate-900/80 px-2 py-1 rounded">
        <span className="text-green-400">●</span> Live • {klineData.length} candles
      </div>
    </div>
  );
}