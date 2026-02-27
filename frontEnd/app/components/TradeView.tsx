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

  // Load last 7 days of historical klines
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const interval = "5m";
        const endTime = Math.floor(Date.now() / 1000);  
        const startTime = endTime - 24 * 60 * 60 ;

        console.log(`Loading klines from ${new Date(startTime)} to ${new Date(endTime)}`);
      
        const response = await fetch(
          `/api/proxy?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
        );

        console.log("Klines API response status:", response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch klines: ${response.statusText}`);
        }

        const klines = await response.json();

        console.log(`Loaded ${klines.length} historical klines`);

        // Transform API response to KLine format
        const formattedKlines: KLine[] = klines.map((k: any) => ({
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
          quoteVolume: k.quoteVolume,
          trades: parseInt(k.trades) || 0,
          start: parseInt(k.start),
          end: parseInt(k.end),
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

    // Destroy existing chart
    if (chartManagerRef.current) {
      chartManagerRef.current.destroy();
    }

    console.log(`Initializing chart with ${klineData} candles`);

    // Create chart with historical data
    const chartManager = new ChartManager(
      chartRef.current,
      klineData
        .map((x) => ({
          close: parseFloat(x.close),
          high: parseFloat(x.high),
          low: parseFloat(x.low),
          open: parseFloat(x.open),
          timestamp: new Date(parseInt(x.end.toString())), 
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
  }, [klineData, isLoading]);
  useEffect(() => {
    if (isLoading || klineData.length === 0) return; 

    const type = "kline";
    const id = `kline-${market}`;
    const interval = "1m";

    const callback = (data: KLine) => {
      console.log("Real-time kline update:", data);

      setKlineData((prevKlines) => {
        const existingIndex = prevKlines.findIndex(
          (k) => k.end.toString() === data.end.toString()
        );

        if (existingIndex !== -1) {
          // Update existing candle (current candle still forming)
          const updated = [...prevKlines];
          updated[existingIndex] = data;
          return updated;
        } else {
          // New candle - add to end
          const updated = [...prevKlines, data];

          // Keep last 7 days worth of data (10,080 candles for 1m interval)
          const maxCandles = 7 * 24 * 60;
          if (updated.length > maxCandles) {
            return updated.slice(-maxCandles);
          }

          return updated;
        }
      });

      // Update chart in real-time
      if (chartManagerRef.current) {
        chartManagerRef.current.update({
          close: parseFloat(data.close),
          high: parseFloat(data.high),
          low: parseFloat(data.low),
          open: parseFloat(data.open),
          timestamp: new Date(parseInt(data.end.toString())),
        });
      }
    };

    SignalingManager.getInstance().registerCallback(type, callback, id);
    SignalingManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`kline.${interval}.${market}`],
    });

    return () => {
      SignalingManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`kline.${interval}.${market}`],
      });
      SignalingManager.getInstance().deRegisterCallback(type, id);
    };
  }, [market, isLoading, klineData.length]);

  if (isLoading) {
    return (
      <div
        style={{ height: "520px", width: "100%", marginTop: 4 }}
        className="flex items-center justify-center bg-[#0e0f14]"
      >
        <div className="text-gray-400">
          <div className="animate-pulse">Loading 7 days of chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height: "520px", width: "100%", marginTop: 4 }}
        className="flex items-center justify-center bg-[#0e0f14]"
      >
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