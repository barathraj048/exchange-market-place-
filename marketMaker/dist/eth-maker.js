import axios from "axios";
const BASE_URL = "http://localhost:3001";
const TOTAL_BIDS = 15;
const TOTAL_ASK = 15;
const MARKET = "ETH_USDC";
const USER_ID = "2"; // Using User 2 so it doesn't conflict with your TATA bot
// Realistic ETH price for mid-2026
let currentMidPrice = 1950;
async function main() {
    try {
        // ETH fluctuates more in dollar terms, so we give it a wider random drift
        const drift = (Math.random() - 0.5) * 5;
        currentMidPrice += drift;
        const openOrders = await axios.get(`${BASE_URL}/api/v1/order/open?userId=${USER_ID}&market=${MARKET}`);
        const totalBids = openOrders.data.filter((o) => String(o.side).toLowerCase() === "buy").length;
        const totalAsks = openOrders.data.filter((o) => String(o.side).toLowerCase() === "sell").length;
        // Clean up orders that have drifted too far from the current market price
        const cancelledBids = await cancelBidsTooFar(openOrders.data, currentMidPrice);
        const cancelledAsks = await cancelAsksTooFar(openOrders.data, currentMidPrice);
        let bidsToAdd = TOTAL_BIDS - totalBids - cancelledBids;
        let asksToAdd = TOTAL_ASK - totalAsks - cancelledAsks;
        while (bidsToAdd > 0 || asksToAdd > 0) {
            if (bidsToAdd > 0) {
                // Spread of at least $1.50 below mid-price
                const bidPrice = currentMidPrice - 1.5 - (Math.random() * 10);
                // Realistic retail crypto sizing (e.g., 0.05 to 0.5 ETH)
                const randomQty = (0.05 + Math.random() * 0.45).toFixed(3);
                await axios.post(`${BASE_URL}/api/v1/order`, {
                    market: MARKET,
                    price: bidPrice.toFixed(2),
                    quantity: randomQty,
                    side: "buy",
                    userId: USER_ID
                });
                bidsToAdd--;
            }
            if (asksToAdd > 0) {
                // Spread of at least $1.50 above mid-price
                const askPrice = currentMidPrice + 1.5 + (Math.random() * 10);
                const randomQty = (0.05 + Math.random() * 0.45).toFixed(3);
                await axios.post(`${BASE_URL}/api/v1/order`, {
                    market: MARKET,
                    price: askPrice.toFixed(2),
                    quantity: randomQty,
                    side: "sell",
                    userId: USER_ID
                });
                asksToAdd--;
            }
        }
    }
    catch (e) {
        console.error("Bot Error:", e.response?.data || e.message);
    }
    // Run the cycle every 1.5 seconds
    setTimeout(main, 1500);
}
async function cancelBidsTooFar(openOrders, midPrice) {
    let promises = [];
    openOrders.forEach(o => {
        const orderPrice = Number(o.price);
        // Cancel if bid crosses the spread, or randomly 20% of the time to keep the book active
        if (String(o.side).toLowerCase() === "buy" && (orderPrice >= midPrice || Math.random() < 0.2)) {
            promises.push(axios.delete(`${BASE_URL}/api/v1/order`, {
                data: { orderId: o.orderId, market: MARKET }
            }));
        }
    });
    await Promise.all(promises);
    return promises.length;
}
async function cancelAsksTooFar(openOrders, midPrice) {
    let promises = [];
    openOrders.forEach(o => {
        const orderPrice = Number(o.price);
        if (String(o.side).toLowerCase() === "sell" && (orderPrice <= midPrice || Math.random() < 0.2)) {
            promises.push(axios.delete(`${BASE_URL}/api/v1/order`, {
                data: { orderId: o.orderId, market: MARKET }
            }));
        }
    });
    await Promise.all(promises);
    return promises.length;
}
main();
//# sourceMappingURL=eth-maker.js.map