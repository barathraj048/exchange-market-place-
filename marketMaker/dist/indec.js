import axios from "axios";
const BASE_URL = "http://localhost:3001";
const TOTAL_BIDS = 15;
const TOTAL_ASK = 15;
const MARKET = "TATA_INR";
const USER_ID = "5";
// A simulated mid-market price. In a real advanced bot, you'd fetch this from the /depth API
let currentMidPrice = 1000;
async function main() {
    try {
        // Slowly drift the market price around to simulate real market movements
        const drift = (Math.random() - 0.5) * 2;
        currentMidPrice += drift;
        const openOrders = await axios.get(`${BASE_URL}/api/v1/order/open?userId=${USER_ID}&market=${MARKET}`);
        const totalBids = openOrders.data.filter((o) => String(o.side).toLowerCase() === "buy").length;
        const totalAsks = openOrders.data.filter((o) => String(o.side).toLowerCase() === "sell").length;
        // Cancel orders that are too far from the current mid-price
        const cancelledBids = await cancelBidsTooFar(openOrders.data, currentMidPrice);
        const cancelledAsks = await cancelAsksTooFar(openOrders.data, currentMidPrice);
        let bidsToAdd = TOTAL_BIDS - totalBids - cancelledBids;
        let asksToAdd = TOTAL_ASK - totalAsks - cancelledAsks;
        while (bidsToAdd > 0 || asksToAdd > 0) {
            if (bidsToAdd > 0) {
                // Ensure bids are strictly BELOW the mid-price (Spread of at least 0.5)
                const bidPrice = currentMidPrice - 0.5 - (Math.random() * 5);
                const randomQty = (1 + Math.random() * 4).toFixed(2); // Random quantities for realism
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
                // Ensure asks are strictly ABOVE the mid-price (Spread of at least 0.5)
                const askPrice = currentMidPrice + 0.5 + (Math.random() * 5);
                const randomQty = (1 + Math.random() * 4).toFixed(2);
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
        // Cancel if bid is above midPrice (would cross the spread) OR randomly cancel to refresh book
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
        // Cancel if ask is below midPrice (would cross the spread) OR randomly cancel
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
//# sourceMappingURL=indec.js.map