import axios from "axios";
// Point this to your Express API server
const BASE_URL = "http://localhost:3001/api/v1/transaction";
// Seeding configuration
const NUM_USERS = 50;
const ORDERS_PER_SIDE = 150;
const MARKET_TRADES_PER_PAIR = 40;
const MARKETS = [
    { symbol: "BTC_USDC", baseAsset: "BTC", quoteAsset: "USDC", midPrice: 65000, spread: 1500, minQty: 0.005, maxQty: 0.5 },
    { symbol: "ETH_USDC", baseAsset: "ETH", quoteAsset: "USDC", midPrice: 1950, spread: 80, minQty: 0.05, maxQty: 5 },
    { symbol: "SOL_USDC", baseAsset: "SOL", quoteAsset: "USDC", midPrice: 85, spread: 5, minQty: 1, maxQty: 50 },
    { symbol: "BNB_USDC", baseAsset: "BNB", quoteAsset: "USDC", midPrice: 600, spread: 15, minQty: 0.1, maxQty: 10 },
    { symbol: "XRP_USDC", baseAsset: "XRP", quoteAsset: "USDC", midPrice: 1.15, spread: 0.08, minQty: 10, maxQty: 1000 },
];
async function seed() {
    console.log("🌱 Starting Exchange Liquidity Seeding Process...");
    const users = Array.from({ length: NUM_USERS }, (_, i) => `trader_${i + 1}`);
    console.log(`\n1️⃣  Funding ${NUM_USERS} Users...`);
    // Changed type definition to Promise<void> for strict native promise handling
    let fundPromises = [];
    for (const user of users) {
        // Explicitly using async/await here guarantees a native standard Promise wrapper
        fundPromises.push(async () => { await axios.post(`${BASE_URL}/deposit`, { userId: user, amount: 10_000_000, asset: "USDC" }); });
        for (const market of MARKETS) {
            fundPromises.push(async () => { await axios.post(`${BASE_URL}/deposit`, { userId: user, amount: 100_000, asset: market.baseAsset }); });
        }
    }
    await executeBatched(fundPromises, 50);
    console.log("✅ All users funded with USDC and Crypto!");
    console.log(`\n2️⃣  Building Order Books (Resting Limit Orders)...`);
    let orderPromises = [];
    for (const market of MARKETS) {
        for (let i = 0; i < ORDERS_PER_SIDE; i++) {
            const bidUser = users[Math.floor(Math.random() * users.length)];
            const bidPrice = market.midPrice - (Math.random() * market.spread) - (market.spread * 0.01);
            const bidQty = market.minQty + Math.random() * (market.maxQty - market.minQty);
            orderPromises.push(async () => {
                await axios.post(`${BASE_URL}`, {
                    userId: bidUser, market: market.symbol, side: "buy", type: "limit",
                    price: bidPrice.toFixed(2), quantity: bidQty.toFixed(4)
                });
            });
            const askUser = users[Math.floor(Math.random() * users.length)];
            const askPrice = market.midPrice + (Math.random() * market.spread) + (market.spread * 0.01);
            const askQty = market.minQty + Math.random() * (market.maxQty - market.minQty);
            orderPromises.push(async () => {
                await axios.post(`${BASE_URL}`, {
                    userId: askUser, market: market.symbol, side: "sell", type: "limit",
                    price: askPrice.toFixed(2), quantity: askQty.toFixed(4)
                });
            });
        }
    }
    await executeBatched(orderPromises, 20);
    console.log("✅ Order Books populated heavily!");
    console.log(`\n3️⃣  Executing Market Trades (Generating Volume & DB History)...`);
    let tradePromises = [];
    for (const market of MARKETS) {
        for (let i = 0; i < MARKET_TRADES_PER_PAIR; i++) {
            const isBuy = Math.random() > 0.5;
            const user = users[Math.floor(Math.random() * users.length)];
            const qty = market.minQty + Math.random() * ((market.maxQty - market.minQty) / 4);
            tradePromises.push(async () => {
                await axios.post(`${BASE_URL}`, {
                    userId: user, market: market.symbol, side: isBuy ? "buy" : "sell", type: "market",
                    quantity: qty.toFixed(4)
                });
            });
        }
    }
    await executeBatched(tradePromises, 10);
    console.log("✅ Market Trades executed! Recent Trades & Klines are populated.");
    console.log("\n🚀 Seeding Complete! Your exchange is now ready to roll.");
}
async function executeBatched(requests, batchSize) {
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        await Promise.all(batch.map(req => req().catch((e) => console.log(`Warning: ${e.response?.data?.message || e.message}`))));
        await new Promise(res => setTimeout(res, 50));
    }
}
seed().catch(console.error);
