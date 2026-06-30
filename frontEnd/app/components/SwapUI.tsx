"use client";
import { useEffect, useState, useRef } from "react";

export function SwapUI({ market }: { market: string }) {
  const [balance, setBalance] = useState<{[key: string]: {available: number, locked: number}}>({});
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState("limit");
  const [price, setPrice] = useState<string | number>("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [depositAmount, setDepositAmount] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [loading, setLoading] = useState(false);

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [notifications, setNotifications] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const userId = "123";
  const src = `http://localhost:3000/api/color/${market.split("_")[0].toLowerCase()}/600`;

  const [baseAsset, quoteAsset] = market.split("_");
  const availableQuote = balance[quoteAsset]?.available || 0;
  const availableBase = balance[baseAsset]?.available || 0;
  const primaryCashAsset = getPrimaryCashAsset(balance, quoteAsset);
  const primaryCashBalance = balance[primaryCashAsset] || { available: 0, locked: 0 };

    function getPrimaryCashAsset(
    balance: Record<string, { available: number; locked: number }>,
    quoteAsset: string
  ): string {
    const preferredAssets = [quoteAsset, "USD", "INR", "USDC"];
    const activeCashAsset = preferredAssets.find((asset) => asset in balance);
    return activeCashAsset || Object.keys(balance)[0] || quoteAsset || "USD";
  }

  const fetchBalance = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/transaction/balance/${userId}`);
      const data = await res.json();
      if (data.success) {
        setBalance(data.data);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3002");
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "AUTH", userId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "AUTH_SUCCESS") {
        setWsStatus("connected");
        ws.send(JSON.stringify({
          type: "SUBSCRIBE",
          userId,
          channel: market,
        }));
      }

      if (data.type === "ORDER_FILLED") {
        setNotifications(prev => [
          `Order Filled: ${data.quantity} @ ${data.price}`,
          ...prev,
        ].slice(0, 20)); // cap the feed so it doesn't grow forever

        // Keep balances in sync with what the engine just did
        fetchBalance();
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
    };

    ws.onerror = () => {
      setWsStatus("disconnected");
    };

    return () => {
      ws.close();
    };
  }, [market]);

  const handleDeposit = async () => {
    if (depositAmount <= 0) {
      return alert("Enter a valid deposit amount");
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/v1/transaction/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amount: depositAmount,
          asset: primaryCashAsset
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Deposited ${depositAmount} ${primaryCashAsset} successfully!`);
        setDepositAmount(0);
        setShowDeposit(false);
        await fetchBalance();
      } else {
        alert(data.message || "Deposit failed");
      }
    } catch (err) {
      console.error("Deposit error:", err);
      alert("Failed to process deposit");
    } finally {
      setLoading(false);
    }
  };

  const sendTransaction = async (side: "buy" | "sell") => {
    if (type === "limit") {
          if (Number(price) <= 0) return alert("Price required");
          if (Number(quantity) <= 0) return alert("Quantity required");
      } else if (type === "market") {
          if (side === "buy" && Number(price) <= 0) return alert("Total USDC to spend required");
          if (side === "sell" && Number(quantity) <= 0) return alert("Quantity to sell required");
        }

    setLoading(true);
    console.log(price)
    const payload = {
      userId,
      market,
      side,
      type,
      price: type === "market" && side === "sell" ? 0 : Number(price),
      quantity: type === "market" && side === "buy" ? undefined : Number(quantity),
    };

    try {
      const res = await fetch("http://localhost:3001/api/v1/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Transaction failed");
      }

      const data = await res.json();
      console.log("Transaction success:", data);

      alert(`${side.toUpperCase()} order placed successfully!`);

      setPrice("");
      setQuantity("");

      await fetchBalance();
    } catch (err: any) {
      console.error("Transaction error:", err);
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const setPercentage = (percentage: number) => {
    if (activeTab === "buy") {
      const available = availableQuote;
      if (type === "market") {
        alert("Enter the base quantity manually for market buys");
        return;
      }

      if (type === "limit" && Number(price) > 0) {
        const qty = (available * percentage) / Number(price);
        setQuantity(Number(qty.toFixed(8)));
      }
    } else {
      const available = availableBase;
      setQuantity(Number((available * percentage).toFixed(8)));
    }
  };

  return (
    <div className="w-full max-w-[360px] bg-[#0E0F14] text-white font-sans border border-[#1E202B] rounded-xl overflow-hidden shadow-xl">
      <div className="flex flex-col">

        {/* Top Navigation / Balance Header */}
        <div className="px-4 py-3 bg-[#141622] border-b border-[#1E202B]">
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-[#848694] uppercase">Balances</h3>
              {/* Live connection indicator */}
              <span
                title={wsStatus}
                className={`w-2 h-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-[#00C38E]"
                    : wsStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-[#F6465D]"
                }`}
              />
            </div>
            <button
              onClick={() => setShowDeposit(!showDeposit)}
              className="text-xs px-2.5 py-1 rounded font-medium bg-[#0284C7] text-white hover:bg-[#0369A1] transition-colors duration-150"
            >
              Deposit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#1C1E2C] p-2.5 rounded-lg border border-[#26293B]">
              <div className="text-[#848694] font-medium mb-0.5">{primaryCashAsset}</div>
              <div className="text-white font-semibold text-sm">
                {primaryCashBalance.available?.toFixed(8) || "0.00"}
              </div>
              <div className="text-[#555768] text-[10px] mt-0.5">
                Locked: {primaryCashBalance.locked?.toFixed(8) || "0.00"}
              </div>
            </div>

            <div className="bg-[#1C1E2C] p-2.5 rounded-lg border border-[#26293B]">
              <div className="text-[#848694] font-medium mb-0.5">{baseAsset}</div>
              <div className="text-white font-semibold text-sm">
                {balance[baseAsset]?.available?.toFixed(8) || "0.00"}
              </div>
              <div className="text-[#555768] text-[10px] mt-0.5">
                Locked: {balance[baseAsset]?.locked?.toFixed(8) || "0.00"}
              </div>
            </div>
          </div>

          {/* Live fill feed - only show if there's something to show */}
          {notifications.length > 0 && (
            <div className="mt-2.5 text-[10px] font-mono bg-black/40 p-1.5 rounded border border-[#26293B] max-h-16 overflow-y-auto">
              {notifications.map((note, i) => (
                <div key={i} className="text-[#00C38E] py-0.5">{note}</div>
              ))}
            </div>
          )}

          {/* Backpack-style Drawer Deposit Form */}
          {showDeposit && (
            <div className="mt-3 p-3 bg-[#1C1E2C] rounded-lg border border-[#26293B] transition-all">
              <div className="relative flex items-center">
                <input
                  type="number"
                  placeholder={`0.00`}
                  className="w-full h-10 rounded-md border border-[#26293B] bg-[#0E0F14] pl-3 pr-16 text-sm text-white placeholder-[#444655] focus:outline-none focus:border-[#0284C7] transition-colors"
                  value={depositAmount || ""}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                />
                <span className="absolute right-3 text-xs font-semibold text-[#848694]">{primaryCashAsset}</span>
              </div>
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full mt-2 h-9 rounded-md bg-[#00C38E] text-[#0E0F14] text-xs font-bold hover:bg-[#00B080] disabled:opacity-40 transition-colors"
              >
                {loading ? "Processing..." : "Confirm Deposit"}
              </button>
            </div>
          )}
        </div>

        {/* Buy/Sell Segmented Tabs */}
        <div className="flex p-1 bg-[#0E0F14] border-b border-[#1E202B]">
          <button
            onClick={() => setActiveTab("buy")}
            className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all duration-150 ${
              activeTab === "buy"
                ? "bg-[#1C2C26] text-[#00C38E] border border-[#00C38E]/30"
                : "text-[#848694] hover:text-white"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all duration-150 ${
              activeTab === "sell"
                ? "bg-[#2D1F22] text-[#F6465D] border border-[#F6465D]/30"
                : "text-[#848694] hover:text-white"
            }`}
          >
            Sell
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-4 border-b border-[#1E202B] pb-2 text-xs font-semibold">
            <button
              onClick={() => setType("limit")}
              className={`pb-1.5 transition-colors ${type === "limit" ? "text-white border-b-2 border-[#0284C7]" : "text-[#848694] hover:text-white"}`}
            >
              Limit
            </button>
            <button
              onClick={() => setType("market")}
              className={`pb-1.5 transition-colors ${type === "market" ? "text-white border-b-2 border-[#0284C7]" : "text-[#848694] hover:text-white"}`}
            >
              Market
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#848694]">Available</span>
              <span className="font-medium text-white">
                {activeTab === "buy"
                  ? `${availableQuote.toFixed(8)} ${quoteAsset}`
                  : `${availableBase.toFixed(8)} ${baseAsset}`}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#848694] font-medium">
                {type === "market" && activeTab === "buy" ? "Total to Spend" : "Price"}
              </label>
              <div className="relative flex items-center">
                <input
                  step="0.01"
                  placeholder={type === "market" && activeTab === "sell" ? "Market Price" : "0.00"}
                  type={type === "market" && activeTab === "sell" ? "text" : "number"} 
                  disabled={type === "market" && activeTab === "sell"}
                  className="w-full h-11 rounded-lg border border-[#1E202B] bg-[#141622] px-3 pr-16 text-right font-mono text-lg text-white placeholder-[#444655] focus:outline-none focus:border-[#26293B] disabled:opacity-40 disabled:bg-[#0E0F14] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={type === "market" && activeTab === "sell" ? "" : price || ""}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                  <img src="/usdc.webp" className="w-4 h-4 rounded-full" alt="USDC" onError={(e) => e.currentTarget.style.display='none'} />
                  <span className="text-xs font-semibold text-[#848694]">USDC</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#848694] font-medium">Quantity</label>
              <div className="relative flex items-center">
                <input
                  step="0.01"
                  placeholder={type === "market" && activeTab === "buy" ? "Est. by Market" : "0.00"}
                  type={type === "market" && activeTab === "buy" ? "text" : "number"}
                  disabled={type === "market" && activeTab === "buy"}
                  className="w-full h-11 rounded-lg border border-[#1E202B] bg-[#141622] px-3 pr-16 text-right font-mono text-lg text-white placeholder-[#444655] focus:outline-none focus:border-[#26293B] disabled:opacity-40 disabled:bg-[#0E0F14] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={type === "market" && activeTab === "buy" ? "" : quantity || ""}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                  <img src={src} className="w-4 h-4 rounded-full" alt={baseAsset} onError={(e) => e.currentTarget.style.display='none'} />
                  <span className="text-xs font-semibold text-[#848694]">{baseAsset}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className="py-1.5 rounded bg-[#141622] border border-[#1E202B] text-center text-xs font-medium text-[#848694] hover:bg-[#1C1E2C] hover:text-white transition-colors"
                >
                  {pct === 1 ? "Max" : `${pct * 100}%`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => sendTransaction(activeTab)}
              disabled={loading}
              className={`w-full h-12 rounded-xl text-sm font-bold mt-2 transition-transform active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none ${
                activeTab === "buy"
                  ? "bg-[#00C38E] text-[#0E0F14] hover:bg-[#00B080]"
                  : "bg-[#F6465D] text-white hover:bg-[#E03F54]"
              }`}
            >
              {loading ? "Processing..." : activeTab === "buy" ? "Buy" : "Sell"}
            </button>

            <div className="flex gap-4 items-center justify-start mt-1 text-[#848694]">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none hover:text-white transition-colors">
                <input
                  id="postOnly"
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-[#26293B] bg-[#141622] text-[#0284C7] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0284C7]"
                />
                Post Only
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none hover:text-white transition-colors">
                <input
                  id="ioc"
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-[#26293B] bg-[#141622] text-[#0284C7] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0284C7]"
                />
                IOC
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}