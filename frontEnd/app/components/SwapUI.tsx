"use client";
import { useEffect, useState } from "react";

export function SwapUI({ market }: { market: string }) {
  const [balance, setBalance] = useState<{[key: string]: {available: number, locked: number}}>({});
  const [activeTab, setActiveTab] = useState("buy");
  const [type, setType] = useState("limit");
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const userId = "123";
  const src = `http://localhost:3000/api/color/${market.split("_")[0].toLowerCase()}/600`;
  
  const [baseAsset, quoteAsset] = market.split("_");
  const availableQuote = balance[quoteAsset]?.available || 0;
  const availableBase = balance[baseAsset]?.available || 0;
  const primaryCashAsset = getPrimaryCashAsset(balance, quoteAsset);
  const primaryCashBalance = balance[primaryCashAsset] || { available: 0, locked: 0 };

  // Fetch balance on mount and after transactions
  useEffect(() => {
    fetchBalance();
  }, []);

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
        // Refresh balance
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
    if (quantity <= 0) return alert("Quantity required");
    if (type === "limit" && price <= 0) return alert("Price required");

    setLoading(true);

    const payload = {
      userId,
      market,
      side,
      type,
      price: type === "limit" ? price : undefined,
      quantity,
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
      
      // Reset form
      setPrice(0);
      setQuantity(0);
      
      // Refresh balance
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
      // For buying, use quote asset balance
      const available = availableQuote;
      if (type === "limit" && price > 0) {
        // quantity = (balance * percentage) / price
        const qty = (available * percentage) / price;
        setQuantity(Number(qty.toFixed(8)));
      } else {
        // For market orders, just set the quote amount
        setQuantity(Number((available * percentage).toFixed(8)));
      }
    } else {
      // For selling, use base asset balance
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
          <h3 className="text-xs font-semibold tracking-wide text-[#848694] uppercase">Balances</h3>
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
              {primaryCashBalance.available?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[#555768] text-[10px] mt-0.5">
              Locked: {primaryCashBalance.locked?.toFixed(2) || "0.00"}
            </div>
          </div>
          
          <div className="bg-[#1C1E2C] p-2.5 rounded-lg border border-[#26293B]">
            <div className="text-[#848694] font-medium mb-0.5">{baseAsset}</div>
            <div className="text-white font-semibold text-sm">
              {balance[baseAsset]?.available?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[#555768] text-[10px] mt-0.5">
              Locked: {balance[baseAsset]?.locked?.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

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

      {/* Buy/Sell Segmented Tabs (Backpack Style Split) */}
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
        {/* Order Type Toggle (Limit / Market) */}
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

        {/* Form Inputs Container */}
        <div className="flex flex-col gap-3.5">
          {/* Available Balance row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#848694]">Available</span>
            <span className="font-medium text-white">
              {activeTab === "buy"
                ? `${availableQuote.toFixed(2)} ${quoteAsset}`
                : `${availableBase.toFixed(2)} ${baseAsset}`}
            </span>
          </div>

          {/* Price Input Block */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#848694] font-medium">Price</label>
            <div className="relative flex items-center">
              <input
                step="0.01"
                placeholder="0.00"
                type="number"
                disabled={type === "market"}
                className="w-full h-11 rounded-lg border border-[#1E202B] bg-[#141622] px-3 pr-14 text-right font-mono text-lg text-white placeholder-[#444655] focus:outline-none focus:border-[#26293B] disabled:opacity-40 disabled:bg-[#0E0F14] transition-colors"
                value={type === "market" ? "" : price || ""}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
              <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                <img src="/usdc.webp" className="w-4 h-4 rounded-full" alt="USDC" onError={(e) => e.currentTarget.style.display='none'} />
                <span className="text-xs font-semibold text-[#848694]">USDC</span>
              </div>
            </div>
          </div>

          {/* Quantity Input Block */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#848694] font-medium">Quantity</label>
            <div className="relative flex items-center">
              <input
                step="0.01"
                placeholder="0.00"
                type="number"
                className="w-full h-11 rounded-lg border border-[#1E202B] bg-[#141622] px-3 pr-14 text-right font-mono text-lg text-white placeholder-[#444655] focus:outline-none focus:border-[#26293B] transition-colors"
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                <img src={src} className="w-4 h-4 rounded-full" alt={baseAsset} onError={(e) => e.currentTarget.style.display='none'} />
                <span className="text-xs font-semibold text-[#848694]">{baseAsset}</span>
              </div>
            </div>
          </div>

          {/* Percentage Fast Selection Pills */}
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

          {/* Execution Button */}
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

          {/* Order Strategy Checkboxes */}
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
import React from "react";

// Explicit string literals matching the exchange state machine
type OrderType = "limit" | "market";
type ActiveTab = "buy" | "sell";

interface BalanceInfo {
  available: number;
  locked: number;
}

interface OrderTypeProps {
  type: OrderType;
  setType: (type: OrderType) => void;
}

interface TabProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

/* ==================== BUTTONS (LIMIT / MARKET) ==================== */

export function LimitButton({ type, setType }: OrderTypeProps) {
  const isActive = type === "limit";
  return (
    <button
      type="button"
      onClick={() => setType("limit")}
      className={`pb-1.5 text-xs font-semibold transition-colors border-b-2 ${
        isActive
          ? "text-white border-[#0284C7]"
          : "text-[#848694] border-transparent hover:text-white"
      }`}
    >
      Limit
    </button>
  );
}

export function MarketButton({ type, setType }: OrderTypeProps) {
  const isActive = type === "market";
  return (
    <button
      type="button"
      onClick={() => setType("market")}
      className={`pb-1.5 text-xs font-semibold transition-colors border-b-2 ${
        isActive
          ? "text-white border-[#0284C7]"
          : "text-[#848694] border-transparent hover:text-white"
      }`}
    >
      Market
    </button>
  );
}

/* ==================== TABS (BUY / SELL) ==================== */

export function BuyButton({ activeTab, setActiveTab }: TabProps) {
  const isActive = activeTab === "buy";
  return (
    <button
      type="button"
      onClick={() => setActiveTab("buy")}
      className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all duration-150 ${
        isActive
          ? "bg-[#1C2C26] text-[#00C38E] border border-[#00C38E]/30"
          : "text-[#848694] hover:text-white"
      }`}
    >
      Buy
    </button>
  );
}

export function SellButton({ activeTab, setActiveTab }: TabProps) {
  const isActive = activeTab === "sell";
  return (
    <button
      type="button"
      onClick={() => setActiveTab("sell")}
      className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all duration-150 ${
        isActive
          ? "bg-[#2D1F22] text-[#F6465D] border border-[#F6465D]/30"
          : "text-[#848694] hover:text-white"
      }`}
    >
      Sell
    </button>
  );
}

/* ==================== UTILITY FUNCTIONS ==================== */

export function getPrimaryCashAsset(
  balance: Record<string, BalanceInfo>,
  quoteAsset: string
): string {
  const preferredAssets = [quoteAsset, "USD", "INR", "USDC"];

  // Use array find for declarative lookup matching key presence
  const activeCashAsset = preferredAssets.find((asset) => asset in balance);

  return activeCashAsset || Object.keys(balance)[0] || quoteAsset || "USD";
}