"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton, SuccessButton } from "./core/Button";

interface Balance {
  [key: string]: {
    available: number;
    locked: number;
  };
}

export const Appbar = () => {
  const route = usePathname();
  const router = useRouter();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [balance, setBalance] = useState<Balance>({});
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAsset, setWithdrawAsset] = useState("USD");
  const [loading, setLoading] = useState(false);

  const userId = "123"; // Replace with actual user ID from auth

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const assets = Object.keys(balance);
    if (!assets.length) {
      return;
    }

    if (!balance[withdrawAsset]) {
      setWithdrawAsset(getPrimaryCashAsset(balance));
    }
  }, [balance, withdrawAsset]);

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
    if (!depositAmount || Number(depositAmount) <= 0) {
      alert("Enter a valid amount");
      return;
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
          amount: Number(depositAmount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully deposited ${depositAmount} ${primaryCashAsset}`);
        setDepositAmount("");
        setShowDepositModal(false);
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

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      alert("Enter a valid amount");
      return;
    }

    const available = balance[withdrawAsset]?.available || 0;
    if (Number(withdrawAmount) > available) {
      alert(`Insufficient ${withdrawAsset} balance`);
      return;
    }

    setLoading(true);
    try {
      // Note: You'll need to implement the withdraw endpoint in your API
      const res = await fetch("http://localhost:3001/api/v1/transaction/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amount: Number(withdrawAmount),
          asset: withdrawAsset,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully withdrew ${withdrawAmount} ${withdrawAsset}`);
        setWithdrawAmount("");
        setShowWithdrawModal(false);
        await fetchBalance();
      } else {
        alert(data.message || "Withdrawal failed");
      }
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  const primaryCashAsset = getPrimaryCashAsset(balance);
  const primaryCashBalance = balance[primaryCashAsset] || { available: 0, locked: 0 };

  const totalBalanceINR = Object.entries(balance).reduce((sum, [asset, bal]) => {
    if (asset === primaryCashAsset) {
      return sum + bal.available + bal.locked;
    }
    return sum;
  }, 0);

  return (
    <>
      <div className="text-white border-b border-slate-800 bg-[#0C0E12]">
        <div className="flex justify-between items-center p-2">
          <div className="flex">
            <div
              className="text-xl pl-4 flex flex-col justify-center cursor-pointer text-white font-semibold"
              onClick={() => router.push("/")}
            >
              Exchange
            </div>
            <div
              className={`text-sm pt-1 flex flex-col justify-center pl-8 cursor-pointer transition-colors ${
                route.startsWith("/markets") ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => router.push("/markets")}
            >
              Markets
            </div>
            <div
              className={`text-sm pt-1 flex flex-col justify-center pl-8 cursor-pointer transition-colors ${
                route.startsWith("/trade") ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => router.push("/trade/SOL_USDC")}
            >
              Trade
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Balance Display - Backpack Style */}
            <div className="hidden md:flex items-center gap-2 bg-[#1A1D24] rounded-lg px-4 py-2 border border-slate-700">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase">Total Balance</span>
                <span className="text-sm font-semibold text-white">
                  {formatAssetAmount(totalBalanceINR, primaryCashAsset)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div onClick={() => setShowDepositModal(true)}>
                <SuccessButton>Deposit</SuccessButton>
              </div>
              <div onClick={() => setShowWithdrawModal(true)}>
                <PrimaryButton>Withdraw</PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal - Backpack Style */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#1A1D24] rounded-xl border border-slate-700 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Deposit {primaryCashAsset}</h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Balance Display */}
            <div className="bg-[#0C0E12] rounded-lg p-4 mb-6 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Current Balance</span>
                <span className="text-lg font-semibold text-white">
                  {formatAssetAmount(primaryCashBalance.available, primaryCashAsset)}
                </span>
              </div>
              {primaryCashBalance.locked > 0 && (
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-slate-500">Locked</span>
                  <span className="text-slate-400">
                    {formatAssetAmount(primaryCashBalance.locked, primaryCashAsset)}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Amount ({primaryCashAsset})</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0C0E12] border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
              />
              <div className="flex gap-2 mt-3">
                {[1000, 5000, 10000, 50000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount.toString())}
                    className="flex-1 bg-[#0C0E12] border border-slate-700 rounded-lg py-2 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                  >
                    {formatAssetAmount(amount, primaryCashAsset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 bg-[#0C0E12] border border-slate-700 rounded-lg py-3 text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="flex-1 bg-green-600 rounded-lg py-3 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal - Backpack Style */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#1A1D24] rounded-xl border border-slate-700 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Withdraw</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Asset Selector */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Asset</label>
              <select
                value={withdrawAsset}
                onChange={(e) => setWithdrawAsset(e.target.value)}
                className="w-full bg-[#0C0E12] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
              >
                {Object.keys(balance).map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance Display */}
            <div className="bg-[#0C0E12] rounded-lg p-4 mb-6 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Available Balance</span>
                <span className="text-lg font-semibold text-white">
                  {(balance[withdrawAsset]?.available || 0).toLocaleString("en-IN")}{" "}
                  {withdrawAsset}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Amount</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0C0E12] border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
              />
              <button
                onClick={() =>
                  setWithdrawAmount((balance[withdrawAsset]?.available || 0).toString())
                }
                className="mt-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                Max: {(balance[withdrawAsset]?.available || 0).toLocaleString("en-IN")}{" "}
                {withdrawAsset}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 bg-[#0C0E12] border border-slate-700 rounded-lg py-3 text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="flex-1 bg-blue-600 rounded-lg py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function getPrimaryCashAsset(balance: Balance) {
  const preferredAssets = ["USD", "INR", "USDC"];

  for (const asset of preferredAssets) {
    if (balance[asset]) {
      return asset;
    }
  }

  return Object.keys(balance)[0] || "USD";
}

function formatAssetAmount(amount: number, asset: string) {
  return `${asset} ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
