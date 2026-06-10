import { Router } from "express";
import { RedisManager } from "../RedisManager.js";
import { CANCEL_ORDER, CREATE_ORDER, GET_OPEN_ORDERS } from "../types/index.js";
export const orderRouter = Router();
orderRouter.post("/", async (req, res) => {
    try {
        const { market, price, quantity, side, userId } = req.body;
        if (!market || !price || !quantity || !side || !userId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const normalizedSide = String(side).toUpperCase();
        if (normalizedSide !== "BUY" && normalizedSide !== "SELL") {
            return res.status(400).json({ success: false, message: "Side must be buy or sell" });
        }
        const engineSide = normalizedSide;
        const result = await RedisManager.getInstances().sendAndAwait({
            type: CREATE_ORDER,
            data: {
                market,
                price: String(price),
                quantity: String(quantity),
                side: engineSide,
                userId,
                orderType: "LIMIT",
            }
        });
        if (result.type === "ORDER_REJECTED") {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to create order" });
    }
});
orderRouter.get("/open", async (req, res) => {
    try {
        const userId = String(req.query.userId || "");
        const market = String(req.query.market || "");
        if (!userId || !market) {
            return res.status(400).json({ success: false, message: "userId and market are required" });
        }
        const result = await RedisManager.getInstances().sendAndAwait({
            type: GET_OPEN_ORDERS,
            data: { userId, market },
        });
        res.json(result.payload || []);
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to fetch open orders" });
    }
});
orderRouter.delete("/", async (req, res) => {
    try {
        const { orderId, market } = req.body;
        if (!orderId || !market) {
            return res.status(400).json({ success: false, message: "orderId and market are required" });
        }
        const result = await RedisManager.getInstances().sendAndAwait({
            type: CANCEL_ORDER,
            data: {
                orderId: String(orderId),
                market: String(market),
            },
        });
        if (result.type === "ORDER_CANCEL_REJECTED") {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to cancel order" });
    }
});
//# sourceMappingURL=order.js.map