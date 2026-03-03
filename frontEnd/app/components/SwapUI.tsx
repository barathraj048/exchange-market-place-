"use client";

import { useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:3001/api/v1";
const DEFAULT_USER_ID = "1";

export function SwapUI({ market }: { market: string }) {
  const [balance, setBalance] = useState(20);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const baseAsset = market.split("_")[0]?.toLowerCase() || "tata";
  const iconSrc = `http://localhost:3000/api/color/${baseAsset}/600`;

  const orderValue = useMemo(() => Number((price * quantity).toFixed(2)), [price, quantity]);

  const updateQuantityByPercentage = (percentage: number) => {
    if (type !== "limit" || price <= 0) {
      setQuantity(0);
      return;
    }

    const quoteToUse = balance * percentage;
    setQuantity(Number((quoteToUse / price).toFixed(6)));
  };

  const placeOrder = async () => {
    if (!market || price <= 0 || quantity <= 0) {
      setMessage("Enter a valid price and quantity before placing an order.");
      return;
    }

    setOrderLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          market,
          price: price.toString(),
          quantity: quantity.toString(),
          side: activeTab.toUpperCase(),
          userId: DEFAULT_USER_ID,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to place order");
      }

      setMessage(`Order placed successfully${data?.payload?.orderId ? `: ${data.payload.orderId}` : "."}`);
      setQuantity(0);
      if (type === "market") {
        setPrice(0);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setOrderLoading(false);
    }
  };

  const depositMoney = async () => {
    if (depositAmount <= 0) {
      setMessage("Enter a valid deposit amount.");
      return;
    }

    setDepositLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/onramp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: depositAmount.toString(),
          userId: DEFAULT_USER_ID,
          txnId: `txn-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to deposit");
      }

      setBalance((prev) => Number((prev + depositAmount).toFixed(2)));
      setDepositAmount(0);
      setMessage("Deposit submitted successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to deposit");
    } finally {
      setDepositLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col">
        <div className="flex flex-row h-[60px]">
          <BuyButton activeTab={activeTab} setActiveTab={setActiveTab} />
          <SellButton activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="flex flex-col gap-1">
          <div className="px-3">
            <div className="flex flex-row flex-0 gap-5">
              <LimitButton type={type} setType={setType} />
              <MarketButton type={type} setType={setType} />
            </div>
          </div>

          <div className="flex flex-col px-3">
            <div className="flex flex-col flex-1 gap-3 text-baseTextHighEmphasis">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-row">
                  <p className="text-xs font-normal text-baseTextMedEmphasis">Available Balance</p>
                  <p className="font-medium text-xs text-baseTextHighEmphasis">{balance} USDC</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-normal text-baseTextMedEmphasis">Price</p>
                <div className="flex flex-col relative">
                  <input
                    step="0.01"
                    placeholder="0"
                    className="h-12 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <div className="flex flex-row absolute right-1 top-1 p-2">
                    <img src="/usdc.webp" className="w-6 h-6" alt="USDC" />
                  </div>
                </div>
              </div>
            </div>

            {type === "limit" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-normal text-baseTextMedEmphasis">Quantity</p>
                <div className="flex flex-col relative">
                  <input
                    step="0.01"
                    placeholder="0"
                    className="h-12 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <div className="flex flex-row absolute right-1 top-1 p-2">
                    <img loading="lazy" decoding="async" src={iconSrc} className="w-6 h-6" alt={baseAsset} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center flex-row mt-2 gap-3">
              <PercentageButton label="25%" onClick={() => updateQuantityByPercentage(0.25)} />
              <PercentageButton label="50%" onClick={() => updateQuantityByPercentage(0.5)} />
              <PercentageButton label="75%" onClick={() => updateQuantityByPercentage(0.75)} />
              <PercentageButton label="Max" onClick={() => updateQuantityByPercentage(1)} />
            </div>

            <p className="text-xs text-baseTextMedEmphasis mt-2">Order Value: {Number.isFinite(orderValue) ? orderValue : 0} USDC</p>

            <button
              type="button"
              className="font-semibold focus:ring-blue-200 focus:none focus:outline-none text-center h-12 rounded-xl text-base px-4 py-2 my-4 bg-greenPrimaryButtonBackground text-greenPrimaryButtonText active:scale-98 disabled:opacity-60"
              onClick={placeOrder}
              disabled={orderLoading}
            >
              {orderLoading ? "Placing..." : `${activeTab === "buy" ? "Buy" : "Sell"} ${baseAsset.toUpperCase()}`}
            </button>

            <div className="border-t border-baseBorderLight pt-3 mt-1">
              <p className="text-xs font-normal text-baseTextMedEmphasis mb-2">Deposit Money (USDC)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="Amount"
                  className="h-10 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] px-3 text-sm w-full"
                />
                <button
                  type="button"
                  onClick={depositMoney}
                  disabled={depositLoading}
                  className="px-3 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {depositLoading ? "Depositing..." : "Deposit"}
                </button>
              </div>
            </div>

            {message && <p className="text-xs mt-3 text-baseTextMedEmphasis">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PercentageButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3"
      onClick={onClick}
    >
      {label}
    </div>
  );
}

function LimitButton({
  type,
  setType,
}: {
  type: "limit" | "market";
  setType: (type: "limit" | "market") => void;
}) {
  return (
    <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType("limit")}>
      <div
        className={`text-sm font-medium py-1 border-b-2 ${
          type === "limit"
            ? "border-accentBlue text-baseTextHighEmphasis"
            : "border-transparent text-baseTextMedEmphasis hover:border-baseTextHighEmphasis hover:text-baseTextHighEmphasis"
        }`}
      >
        Limit
      </div>
    </div>
  );
}

function MarketButton({
  type,
  setType,
}: {
  type: "limit" | "market";
  setType: (type: "limit" | "market") => void;
}) {
  return (
    <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType("market")}>
      <div
        className={`text-sm font-medium py-1 border-b-2 ${
          type === "market"
            ? "border-accentBlue text-baseTextHighEmphasis"
            : "border-b-2 border-transparent text-baseTextMedEmphasis hover:border-baseTextHighEmphasis hover:text-baseTextHighEmphasis"
        }`}
      >
        Market
      </div>
    </div>
  );
}

function BuyButton({
  activeTab,
  setActiveTab,
}: {
  activeTab: "buy" | "sell";
  setActiveTab: (tab: "buy" | "sell") => void;
}) {
  return (
    <div
      className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 ${
        activeTab === "buy"
          ? "border-b-greenBorder bg-greenBackgroundTransparent"
          : "border-b-baseBorderMed hover:border-b-baseBorderFocus"
      }`}
      onClick={() => setActiveTab("buy")}
    >
      <p className="text-center text-sm font-semibold text-greenText">Buy</p>
    </div>
  );
}

function SellButton({
  activeTab,
  setActiveTab,
}: {
  activeTab: "buy" | "sell";
  setActiveTab: (tab: "buy" | "sell") => void;
}) {
  return (
    <div
      className={`flex flex-col mb-[-2px] flex-1 cursor-pointer justify-center border-b-2 p-4 ${
        activeTab === "sell"
          ? "border-b-redBorder bg-redBackgroundTransparent"
          : "border-b-baseBorderMed hover:border-b-baseBorderFocus"
      }`}
      onClick={() => setActiveTab("sell")}
    >
      <p className="text-center text-sm font-semibold text-redText">Sell</p>
    </div>
  );
}
