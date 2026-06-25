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
const TARGET_OPEN_ORDERS_PER_SIDE = 40;
const BOT_CYCLE_MS = 2000;
let livePrices = {};
// 2. Main Execution Loop
async function startMasterMaker() {
    console.log("🚀 Initializing Master Market Maker...");
    await ensureMakerAccounts();
    console.log("📡 Fetching initial price oracle data...");
    // Force a successful price fetch BEFORE continuing
    await updateLivePrices();
    while (Object.keys(livePrices).length === 0) {
        console.log("Waiting for price oracle...");
        await new Promise(res => setTimeout(res, 1000));
        await updateLivePrices();
    }
    setInterval(updateLivePrices, 5000);
    console.log("🧱 Bootstrapping initial order books (Liquidity Walls)...");
    await bootstrapOrderBook();
    console.log("🌊 Liquidity floodgates opened! Managing 5 markets concurrently...");
    SUPPORTED_MARKETS.forEach((market) => {
        runMarketLoop(market);
    });
}
// 3. Price Oracle
async function updateLivePrices() {
    try {
        const res = await axios.get(BACKPACK_API_URL);
        const tickers = res.data;
        SUPPORTED_MARKETS.forEach(market => {
            const ticker = tickers.find((t) => t.symbol === market.symbol);
            if (ticker && ticker.lastPrice) {
                livePrices[market.symbol] = parseFloat(ticker.lastPrice);
            }
        });
    }
    catch (error) {
        console.error("⚠️ Failed to fetch live prices from Backpack.");
    }
}
// 4. The Bootstrapper
async function bootstrapOrderBook() {
    let bootstrapPromises = [];
    for (const market of SUPPORTED_MARKETS) {
        const midPrice = livePrices[market.symbol];
        if (!midPrice)
            continue;
        console.log(`   -> Seeding ${market.symbol} around $${midPrice}...`);
        for (let i = 1; i <= 50; i++) {
            const bidUser = `trader_maker_${Math.floor(Math.random() * 10)}`;
            const askUser = `trader_maker_${Math.floor(Math.random() * 10)}`;
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
    await executeBatched(bootstrapPromises, 20);
    console.log("✅ Bootstrapping complete. Order books are deep.");
}
// 5. High Frequency Loop
async function runMarketLoop(marketDef) {
    const { symbol, spread, minQty, maxQty } = marketDef;
    try {
        const midPrice = livePrices[symbol];
        if (!midPrice) {
            setTimeout(() => runMarketLoop(marketDef), BOT_CYCLE_MS);
            return;
        }
        const userId = `trader_maker_${Math.floor(Math.random() * 10)}`;
        const openOrdersRes = await axios.get(`${LOCAL_API_URL}/order/open?userId=${userId}&market=${symbol}`);
        const openOrders = openOrdersRes.data;
        const totalBids = openOrders.filter((o) => String(o.side).toLowerCase() === "buy").length;
        const totalAsks = openOrders.filter((o) => String(o.side).toLowerCase() === "sell").length;
        const cancelledBids = await cancelBidsTooFar(openOrders, midPrice, symbol, userId);
        const cancelledAsks = await cancelAsksTooFar(openOrders, midPrice, symbol, userId);
        let bidsToAdd = TARGET_OPEN_ORDERS_PER_SIDE - totalBids - cancelledBids;
        let asksToAdd = TARGET_OPEN_ORDERS_PER_SIDE - totalAsks - cancelledAsks;
        let newOrderPromises = [];
        while (bidsToAdd > 0 || asksToAdd > 0) {
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
        // Taker Volume
        if (Math.random() < 0.3) {
            const isBuy = Math.random() > 0.5;
            const mktQty = minQty + (Math.random() * (maxQty - minQty) * 0.5);
            newOrderPromises.push(axios.post(`${LOCAL_API_URL}/transaction`, {
                market: symbol,
                quantity: mktQty.toFixed(4),
                side: isBuy ? "buy" : "sell",
                type: "market",
                userId: `trader_taker_${Math.floor(Math.random() * 5)}`
            }));
        }
        await executeBatched(newOrderPromises, 15);
    }
    catch (e) {
        if (!e.response?.data?.message?.includes("Insufficient")) {
            console.log(`[${symbol}] Bot Cycle Note:`, e.response?.data?.message || e.message);
        }
    }
    setTimeout(() => runMarketLoop(marketDef), BOT_CYCLE_MS);
}
// 6. Cleanup & Utils
async function cancelBidsTooFar(openOrders, midPrice, market, userId) {
    let promises = [];
    openOrders.forEach(o => {
        const orderPrice = Number(o.price);
        if (String(o.side).toLowerCase() === "buy" && (orderPrice >= midPrice || Math.random() < 0.3)) {
            promises.push(axios.delete(`${LOCAL_API_URL}/order`, { data: { orderId: o.orderId, market } }));
        }
    });
    await executeBatched(promises, 10);
    return promises.length;
}
async function cancelAsksTooFar(openOrders, midPrice, market, userId) {
    let promises = [];
    openOrders.forEach(o => {
        const orderPrice = Number(o.price);
        if (String(o.side).toLowerCase() === "sell" && (orderPrice <= midPrice || Math.random() < 0.3)) {
            promises.push(axios.delete(`${LOCAL_API_URL}/order`, { data: { orderId: o.orderId, market } }));
        }
    });
    await executeBatched(promises, 10);
    return promises.length;
}
async function ensureMakerAccounts() {
    const accountPromises = [];
    for (let i = 0; i < 15; i++) {
        const isMaker = i < 10;
        const userId = isMaker ? `trader_maker_${i}` : `trader_taker_${i - 10}`;
        accountPromises.push(axios.post(`${LOCAL_API_URL}/transaction/deposit`, { userId, amount: 10_000_000, asset: "USDC" }));
        SUPPORTED_MARKETS.forEach(m => {
            accountPromises.push(axios.post(`${LOCAL_API_URL}/transaction/deposit`, { userId, amount: 1_000_000, asset: m.baseAsset }));
        });
    }
    await executeBatched(accountPromises, 20);
    console.log("✅ 15 Automated Accounts Funded.");
}
async function executeBatched(requests, batchSize) {
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        await new Promise(res => setTimeout(res, 20));
    }
}
startMasterMaker();
//# sourceMappingURL=indec.js.map