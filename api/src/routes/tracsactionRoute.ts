import { Router } from "express";
import { type RedisClientType, createClient } from "redis";
import { CREATE_ORDER, ON_RAMP, OFF_RAMP, GET_BALANCE } from "../types/index.js";

export const transactionRoute = Router();

// Redis client for publishing to engine
const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Redis client for subscribing to responses
const redisSubscriber: RedisClientType = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.connect().catch(console.error);
redisSubscriber.connect().catch(console.error);

// Store pending requests with timeouts
const pendingRequests = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }
>();

// Subscribe to API responses from engine
redisSubscriber.subscribe("api_response", (message) => {
  try {
    const response = JSON.parse(message);
    const { clientId, data } = response;

    const pending = pendingRequests.get(clientId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(data);
      pendingRequests.delete(clientId);
    }
  } catch (error) {
    console.error("Error processing API response:", error);
  }
});

// Helper to send message to engine and wait for response
async function sendToEngine(
  userId: string,
  message: any,
  timeoutMs: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(userId);
      reject(new Error("Request timeout"));
    }, timeoutMs);

    pendingRequests.set(userId, { resolve, reject, timeout });

    // Publish to engine queue
    redisClient.publish(
      "engine_queue",
      JSON.stringify({
        ClientId: userId,
        message,
      })
    );
  });
}

// POST /api/v1/transaction - Create order
transactionRoute.post("/", async (req, res) => {
  try {
    const { userId, market, side, type, price, quantity } = req.body;

    // Validate required fields
    if (!userId || !market || !side || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, market, side, quantity",
      });
    }

    // Validate side
    if (side !== "buy" && side !== "sell") {
      return res.status(400).json({
        success: false,
        message: "Side must be 'buy' or 'sell'",
      });
    }

    // For limit orders, price is required
    if (type === "limit" && (!price || Number(price) <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Price is required for limit orders",
      });
    }

    // Validate quantity
    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // For market orders, use a high/low price to ensure execution
    let orderPrice = price;
    if (type === "market") {
      orderPrice = side === "buy" ? "999999" : "0.01";
    }

    // Send order to engine
    const response = await sendToEngine(userId, {
      type: CREATE_ORDER,
      data: {
        userId,
        price: String(orderPrice),
        quantity: String(quantity),
        side: side.toUpperCase(),
        market,
      },
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
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
    const { userId, amount } = req.body;

    if (!userId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId or amount",
      });
    }

    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await sendToEngine(userId, {
      type: ON_RAMP,
      data: {
        userId,
        amount: String(amount),
        txnId,
      },
    });

    res.json({
      success: true,
      data: {
        txnId,
        amount: Number(amount),
        message: "Deposit successful",
      },
    });
  } catch (error: any) {
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

    // First, check if user has sufficient balance
    const balanceResponse = await sendToEngine(userId, {
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

    // Send withdrawal request to engine
    const response = await sendToEngine(userId, {
      type: OFF_RAMP,
      data: {
        userId,
        amount: String(amount),
        asset,
        txnId,
      },
    });

    res.json({
      success: true,
      data: {
        txnId,
        amount: Number(amount),
        asset,
        message: "Withdrawal successful",
      },
    });
  } catch (error: any) {
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

    // Request balance from engine
    const response = await sendToEngine(userId, {
      type: GET_BALANCE,
      data: { userId },
    });

    res.json({
      success: true,
      data: response.payload || response,
    });
  } catch (error: any) {
    console.error("Balance fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch balance",
    });
  }
});
