import { Router } from "express";
import { RedisManager } from "../RedisManager.js";
import { CREATE_ORDER, ON_RAMP, OFF_RAMP, GET_BALANCE } from "../types/index.js";
export const transactionRoute = Router();
async function sendToEngine(message, timeoutMs = 5000) {
    const responsePromise = RedisManager.getInstances().sendAndAwait(message);
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error("Request timeout"));
        }, timeoutMs);
    });
    return Promise.race([responsePromise, timeoutPromise]);
}
// POST /api/v1/transaction - Create order
transactionRoute.post("/", async (req, res) => {
    try {
        const { userId, market, side, type = "limit", price, quantity } = req.body;
        if (!userId || !market || !side || !price || Number(price) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Missing or invalid required fields: userId, market, side, price",
            });
        }
        if (side !== "buy" && side !== "sell") {
            return res.status(400).json({
                success: false,
                message: "Side must be 'buy' or 'sell'",
            });
        }
        if (type !== "limit" && type !== "market") {
            return res.status(400).json({
                success: false,
                message: "Type must be 'limit' or 'market'",
            });
        }
        if (type === "limit" && (!quantity || Number(quantity) <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Quantity is required and must be greater than 0 for limit orders",
            });
        }
        const orderType = type === "market" ? "MARKET" : "LIMIT";
        const enginePayload = {
            userId,
            market,
            side: side.toUpperCase(),
            orderType,
            quantity: quantity ? String(quantity) : "0",
            price: String(price),
        };
        const response = await sendToEngine({
            type: CREATE_ORDER,
            data: enginePayload,
        });
        if (response.type === "ORDER_REJECTED") {
            return res.status(400).json({
                success: false,
                message: response.payload?.error || "Order rejected",
                data: response,
            });
        }
        res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Transaction error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to process transaction",
        });
    }
});
// POST /api/v1/transaction/deposit - Deposit funds (on-ramp)
transactionRoute.post("/deposit", async (req, res) => {
    try {
        const { userId, amount, asset } = req.body;
        if (!userId || !amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId or amount",
            });
        }
        const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const response = await sendToEngine({
            type: ON_RAMP,
            data: {
                userId,
                amount: String(amount),
                asset,
                txnId,
            },
        });
        if (response.type === "DEPOSIT_FAILED") {
            return res.status(400).json({
                success: false,
                message: response.payload?.error || "Deposit failed",
            });
        }
        res.json({
            success: true,
            data: {
                txnId,
                amount: Number(amount),
                asset: response.payload?.currency || asset,
                balance: response.payload?.balance,
                message: "Deposit successful",
            },
        });
    }
    catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to process deposit",
        });
    }
});
// POST /api/v1/transaction/withdraw - Withdraw funds (off-ramp)
transactionRoute.post("/withdraw", async (req, res) => {
    try {
        const { userId, amount, asset } = req.body;
        if (!userId || !amount || !asset || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId, amount, or asset",
            });
        }
        const balanceResponse = await sendToEngine({
            type: GET_BALANCE,
            data: { userId },
        });
        const userBalance = balanceResponse.payload || balanceResponse;
        const available = userBalance[asset]?.available || 0;
        if (available < Number(amount)) {
            return res.status(400).json({
                success: false,
                message: `Insufficient ${asset} balance. Available: ${available}`,
            });
        }
        const txnId = `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const response = await sendToEngine({
            type: OFF_RAMP,
            data: {
                userId,
                amount: String(amount),
                asset,
                txnId,
            },
        });
        if (response.type === "WITHDRAW_FAILED") {
            return res.status(400).json({
                success: false,
                message: response.payload?.error || "Withdrawal failed",
            });
        }
        res.json({
            success: true,
            data: {
                txnId,
                amount: Number(amount),
                asset,
                balance: response.payload?.balance,
                message: "Withdrawal successful",
            },
        });
    }
    catch (error) {
        console.error("Withdraw error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to process withdrawal",
        });
    }
});
// GET /api/v1/transaction/balance/:userId - Get user balance
transactionRoute.get("/balance/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const response = await sendToEngine({
            type: GET_BALANCE,
            data: { userId },
        });
        res.json({
            success: true,
            data: response.payload || response,
        });
    }
    catch (error) {
        console.error("Balance fetch error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch balance",
        });
    }
});
//# sourceMappingURL=tracsactionRoute.js.map