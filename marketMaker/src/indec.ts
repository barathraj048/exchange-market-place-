import axios from "axios";

// 1. Configuration
const LOCAL_API_URL = "http://localhost:3001/api/v1";
const BACKPACK_API_URL = "https://api.backpack.exchange/api/v1/tickers";

const SUPPORTED_MARKETS = [
  { symbol: "BTC_USDC", baseAsset: "BTC", spread: 10, minQty: 0.001, maxQty: 0.1 },
  { symbol: "ETH_USDC", baseAsset: "ETH", spread: 2, minQty: 0.01, maxQty: 1.5 },
  { symbol: "SOL_USDC", baseAsset: "SOL", spread: 0.1, minQty: 0.5, maxQty: 15 },
  { symbol: "BNB_USDC", baseAsset: "BNB", spread: 0.5, minQty: 0.05, maxQty: 5 },
  { symbol: "XRP_USDC", baseAsset: "XRP", spread: 0.002, minQty: 10, maxQty: 500 },
];

const TARGET_OPEN_ORDERS_PER_SIDE = 40; // Depth per side per market
const BOT_CYCLE_MS = 2000; // Refreshes books every 2 seconds

// In-memory cache for real-world prices fetched from Backpack
let livePrices: Record<string, number> = {};

// 2. Main Execution Loop
async function startMasterMaker() {
  console.log("🚀 Initializing Master Market Maker...");
  
  // Create 10 dedicated maker accounts and fund them
  await ensureMakerAccounts();

  // Fetch real prices before doing anything
  console.log("📡 Fetching initial price oracle data...");
  await updateLivePrices();
  setInterval(updateLivePrices, 5000);

  // Give price fetcher a second to grab initial data
  await new Promise(res => setTimeout(res, 1000));

  // --- BOOTSTRAP PHASE ---
  // Create the initial "Liquidity Wall" so the engine isn't empty on the first tick
  console.log("🧱 Bootstrapping initial order books (Liquidity Walls)...");
  await bootstrapOrderBook();

  console.log("🌊 Liquidity floodgates opened! Managing 5 markets concurrently...");

  // Spin up an isolated bot loop for each market
  SUPPORTED_MARKETS.forEach((market) => {
    runMarketLoop(market);
  });
}

// 3. Price Oracle (Syncs with Backpack)
async function updateLivePrices() {
  try {
    const res = await axios.get(BACKPACK_API_URL);
    const tickers = res.data;

    SUPPORTED_MARKETS.forEach(market => {
      const ticker = tickers.find((t: any) => t.symbol === market.symbol);
      if (ticker && ticker.lastPrice) {
        livePrices[market.symbol] = parseFloat(ticker.lastPrice);
      }
    });
  } catch (error: any) {
    console.error("⚠️ Failed to fetch live prices from Backpack. Using previous cache.");
  }
}

// --- NEW: The Bootstrapper ---
async function bootstrapOrderBook() {
  let bootstrapPromises: Promise<any>[] = [];

  for (const market of SUPPORTED_MARKETS) {
    const midPrice = livePrices[market.symbol];
    if (!midPrice) continue;

    console.log(`   -> Seeding ${market.symbol} around $${midPrice}...`);

    // Create 50 bids stepping down, and 50 asks stepping up
    for (let i = 1; i <= 50; i++) {
      const bidUser = `trader_maker_${Math.floor(Math.random() * 10)}`;
      const askUser = `trader_maker_${Math.floor(Math.random() * 10)}`;

      // Widen the spread artificially for the deep book
      const bidPrice = midPrice - (market.spread * i * 0.5); 
      const askPrice = midPrice + (market.spread * i * 0.5);
      
      const qty = market.minQty + (Math.random() * (market.maxQty - market.minQty));

      bootstrapPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
        market: market.symbol,
        price: bidPrice.toFixed(4),
        quantity: qty.toFixed(4),
        side: "buy",
        type: "limit",
        userId: bidUser
      }));

      bootstrapPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
        market: market.symbol,
        price: askPrice.toFixed(4),
        quantity: qty.toFixed(4),
        side: "sell",
        type: "limit",
        userId: askUser
      }));
    }
  }

  // Execute the massive batch of resting orders
  await executeBatched(bootstrapPromises, 20);
  console.log("✅ Bootstrapping complete. Order books are deep.");
}


// 4. Per-Market Bot Logic (High Frequency Loop)
async function runMarketLoop(marketDef: typeof SUPPORTED_MARKETS[0]) {
  const { symbol, spread, minQty, maxQty } = marketDef;

  try {
    const midPrice = livePrices[symbol];
    if (!midPrice) {
      setTimeout(() => runMarketLoop(marketDef), BOT_CYCLE_MS);
      return;
    }

    // Pick a random maker account for this cycle
    const userId = `trader_maker_${Math.floor(Math.random() * 10)}`;

    const openOrdersRes = await axios.get(`${LOCAL_API_URL}/order/open?userId=${userId}&market=${symbol}`);
    const openOrders = openOrdersRes.data;

    const totalBids = openOrders.filter((o: any) => String(o.side).toLowerCase() === "buy").length;
    const totalAsks = openOrders.filter((o: any) => String(o.side).toLowerCase() === "sell").length;

    // Clean up stale orders
    const cancelledBids = await cancelBidsTooFar(openOrders, midPrice, symbol, userId);
    const cancelledAsks = await cancelAsksTooFar(openOrders, midPrice, symbol, userId);

    let bidsToAdd = TARGET_OPEN_ORDERS_PER_SIDE - totalBids - cancelledBids;
    let asksToAdd = TARGET_OPEN_ORDERS_PER_SIDE - totalAsks - cancelledAsks;

    let newOrderPromises: Promise<any>[] = [];

    while(bidsToAdd > 0 || asksToAdd > 0) {
      if (bidsToAdd > 0) {
        const bidPrice = midPrice - (spread / 2) - (Math.random() * spread * 2);
        const randomQty = minQty + (Math.random() * (maxQty - minQty));

        newOrderPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
          market: symbol,
          price: bidPrice.toFixed(4),
          quantity: randomQty.toFixed(4),
          side: "buy",
          type: "limit",
          userId: userId
        }));
        bidsToAdd--;
      }
      
      if (asksToAdd > 0) {
        const askPrice = midPrice + (spread / 2) + (Math.random() * spread * 2);
        const randomQty = minQty + (Math.random() * (maxQty - minQty));

        newOrderPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
          market: symbol,
          price: askPrice.toFixed(4),
          quantity: randomQty.toFixed(4),
          side: "sell",
          type: "limit",
          userId: userId
        }));
        asksToAdd--;
      }
    }

    // Taker Volume: Eat the resting orders to generate trades!
    if (Math.random() < 0.3) {
      const isBuy = Math.random() > 0.5;
      const mktQty = minQty + (Math.random() * (maxQty - minQty) * 0.5);
      newOrderPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
          market: symbol,
          quantity: mktQty.toFixed(4),
          side: isBuy ? "buy" : "sell",
          type: "market",
          userId: `trader_taker_${Math.floor(Math.random() * 5)}` // Separate taker accounts
      }));
    }

    // Execute batch
    await executeBatched(newOrderPromises, 15);

  } catch (e: any) {
    if (!e.response?.data?.message?.includes("Insufficient")) {
       console.log(`[${symbol}] Bot Cycle Note:`, e.response?.data?.message || e.message);
    }
  }

  setTimeout(() => runMarketLoop(marketDef), BOT_CYCLE_MS);
}

// 5. Cleanup Helpers
async function cancelBidsTooFar(openOrders: any[], midPrice: number, market: string, userId: string) {
  let promises: Promise<any>[] = [];
  openOrders.forEach(o => {
    const orderPrice = Number(o.price);
    if (String(o.side).toLowerCase() === "buy" && (orderPrice >= midPrice || Math.random() < 0.3)) {
      promises.push(axios.delete(`${LOCAL_API_URL}/order`, { data: { orderId: o.orderId, market } }));
    }
  });
  await executeBatched(promises, 10);
  return promises.length;
}

async function cancelAsksTooFar(openOrders: any[], midPrice: number, market: string, userId: string) {
  let promises: Promise<any>[] = [];
  openOrders.forEach(o => {
    const orderPrice = Number(o.price);
    if (String(o.side).toLowerCase() === "sell" && (orderPrice <= midPrice || Math.random() < 0.3)) {
      promises.push(axios.delete(`${LOCAL_API_URL}/order`, { data: { orderId: o.orderId, market } }));
    }
  });
  await executeBatched(promises, 10);
  return promises.length;
}

// 6. Utility Functions
async function ensureMakerAccounts() {
  const accountPromises: Promise<any>[] = [];
  
  // 10 Maker accounts + 5 Taker accounts
  for (let i = 0; i < 15; i++) {
    const isMaker = i < 10;
    const userId = isMaker ? `trader_maker_${i}` : `trader_taker_${i - 10}`;
    
    // Give each account massive balances
    accountPromises.push(axios.post(`${LOCAL_API_URL}/transaction/deposit`, { userId, amount: 10_000_000, asset: "USDC" }));
    SUPPORTED_MARKETS.forEach(m => {
       accountPromises.push(axios.post(`${LOCAL_API_URL}/transaction/deposit`, { userId, amount: 1_000_000, asset: m.baseAsset }));
    });
  }
  
  await executeBatched(accountPromises, 20);
  console.log("✅ 15 Automated Accounts Funded.");
}

async function executeBatched(requests: Promise<any>[], batchSize: number) {
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    await Promise.allSettled(batch); 
    await new Promise(res => setTimeout(res, 20)); // brief pause
  }
}

// Start
startMasterMaker();