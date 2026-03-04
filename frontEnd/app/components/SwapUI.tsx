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
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Deposited ${depositAmount} INR successfully!`);
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
    <div>
      <div className="flex flex-col">
        {/* Balance Display */}
        <div className="px-3 py-3 bg-baseBackgroundL1 border-b border-baseBorderMed">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-baseTextHighEmphasis">Your Balance</h3>
            <button
              onClick={() => setShowDeposit(!showDeposit)}
              className="text-xs px-3 py-1 rounded bg-accentBlue text-white hover:bg-blue-600"
            >
              Deposit
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-baseBackgroundL2 p-2 rounded">
              <div className="text-baseTextMedEmphasis">INR</div>
              <div className="text-baseTextHighEmphasis font-medium">
                {balance.INR?.available?.toFixed(2) || "0.00"}
              </div>
              <div className="text-baseTextMedEmphasis text-[10px]">
                Locked: {balance.INR?.locked?.toFixed(2) || "0.00"}
              </div>
            </div>
            <div className="bg-baseBackgroundL2 p-2 rounded">
              <div className="text-baseTextMedEmphasis">{baseAsset}</div>
              <div className="text-baseTextHighEmphasis font-medium">
                {balance[baseAsset]?.available?.toFixed(2) || "0.00"}
              </div>
              <div className="text-baseTextMedEmphasis text-[10px]">
                Locked: {balance[baseAsset]?.locked?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Deposit Form */}
          {showDeposit && (
            <div className="mt-3 p-3 bg-baseBackgroundL2 rounded">
              <input
                type="number"
                placeholder="Amount to deposit (INR)"
                className="w-full h-10 rounded border-2 border-baseBorderLight bg-baseBackgroundL1 px-3 text-sm"
                value={depositAmount || ""}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
              />
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full mt-2 h-8 rounded bg-greenPrimaryButtonBackground text-greenPrimaryButtonText text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Deposit"}
              </button>
            </div>
          )}
        </div>

        {/* Buy/Sell Tabs */}
        <div className="flex flex-row h-[60px]">
          <BuyButton activeTab={activeTab} setActiveTab={setActiveTab} />
          <SellButton activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="flex flex-col gap-1">
          {/* Limit/Market Toggle */}
          <div className="px-3">
            <div className="flex flex-row flex-0 gap-5 undefined">
              <LimitButton type={type} setType={setType} />
              <MarketButton type={type} setType={setType} />
            </div>
          </div>

          <div className="flex flex-col px-3">
            <div className="flex flex-col flex-1 gap-3 text-baseTextHighEmphasis">
              {/* Available Balance */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-row">
                  <p className="text-xs font-normal text-baseTextMedEmphasis">Available Balance</p>
                  <p className="font-medium text-xs text-baseTextHighEmphasis">
                    {activeTab === "buy"
                      ? `${availableQuote.toFixed(2)} ${quoteAsset}`
                      : `${availableBase.toFixed(2)} ${baseAsset}`}
                  </p>
                </div>
              </div>

              {/* Price Input */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-normal text-baseTextMedEmphasis">Price</p>
                <div className="flex flex-col relative">
                  <input
                    step="0.01"
                    placeholder="0"
                    className="h-12 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    value={price || ""}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    disabled={type === "market"}
                  />
                  <div className="flex flex-row absolute right-1 top-1 p-2">
                    <div className="relative">
                      <img src="/usdc.webp" className="w-6 h-6" alt="USDC" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-normal text-baseTextMedEmphasis">Quantity</p>
                <div className="flex flex-col relative">
                  <input
                    step="0.01"
                    placeholder="0"
                    className="h-12 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <div className="flex flex-row absolute right-1 top-1 p-2">
                    <div className="relative">
                      <img loading="lazy" decoding="async" src={src} className="w-6 h-6" alt={baseAsset} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Percentage Buttons */}
              <div className="flex justify-center flex-row mt-2 gap-3">
                <div
                  className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3"
                  onClick={() => setPercentage(0.25)}
                >
                  25%
                </div>
                <div
                  className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3"
                  onClick={() => setPercentage(0.5)}
                >
                  50%
                </div>
                <div
                  className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3"
                  onClick={() => setPercentage(0.75)}
                >
                  75%
                </div>
                <div
                  className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3"
                  onClick={() => setPercentage(1)}
                >
                  Max
                </div>
              </div>

              {/* Buy/Sell Button */}
              {activeTab === "buy" ? (
                <button
                  type="button"
                  onClick={() => sendTransaction("buy")}
                  disabled={loading}
                  className="font-semibold focus:ring-blue-200 focus:none focus:outline-none text-center h-12 rounded-xl text-base px-4 py-2 my-4 bg-greenPrimaryButtonBackground text-greenPrimaryButtonText active:scale-98 disabled:opacity-50"
                  data-rac=""
                >
                  {loading ? "Processing..." : "Buy"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sendTransaction("sell")}
                  disabled={loading}
                  className="font-semibold h-12 rounded-xl text-base px-4 py-2 my-4 bg-redBackgroundTransparent text-redPrimaryButtonText hover:bg-redBackground active:scale-98 focus:outline-none disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Sell"}
                </button>
              )}

              {/* Order Options */}
              <div className="flex justify-between flex-row mt-1">
                <div className="flex flex-row gap-2">
                  <div className="flex items-center">
                    <input
                      className="form-checkbox rounded border border-solid border-baseBorderMed bg-base-950 font-light text-transparent shadow-none shadow-transparent outline-none ring-0 ring-transparent checked:border-baseBorderMed checked:bg-base-900 checked:hover:border-baseBorderMed focus:bg-base-900 focus:ring-0 focus:ring-offset-0 focus:checked:border-baseBorderMed cursor-pointer h-5 w-5"
                      id="postOnly"
                      type="checkbox"
                      data-rac=""
                    />
                    <label className="ml-2 text-xs">Post Only</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      className="form-checkbox rounded border border-solid border-baseBorderMed bg-base-950 font-light text-transparent shadow-none shadow-transparent outline-none ring-0 ring-transparent checked:border-baseBorderMed checked:bg-base-900 checked:hover:border-baseBorderMed focus:bg-base-900 focus:ring-0 focus:ring-offset-0 focus:checked:border-baseBorderMed cursor-pointer h-5 w-5"
                      id="ioc"
                      type="checkbox"
                      data-rac=""
                    />
                    <label className="ml-2 text-xs">IOC</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitButton({ type, setType }: { type: string; setType: any }) {
  return (
    <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType("limit")}>
      <div
        onClick={() => setType("limit")}
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

function MarketButton({ type, setType }: { type: string; setType: any }) {
  return (
    <div className="flex flex-col cursor-pointer justify-center py-2" onClick={() => setType("market")}>
      <div
        onClick={() => setType("market")}
        className={`text-sm font-medium py-1 border-b-2 ${
          type === "market"
            ? "border-accentBlue text-baseTextHighEmphasis"
            : "border-b-2 border-transparent text-baseTextMedEmphasis hover:border-baseTextHighEmphasis hover:text-baseTextHighEmphasis"
        } `}
      >
        Market
      </div>
    </div>
  );
}

function BuyButton({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: any }) {
  return (
    <div
      onClickCapture={() => setActiveTab("buy")}
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

function SellButton({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: any }) {
  return (
    <div
      onClickCapture={() => setActiveTab("sell")}
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