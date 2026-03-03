import { Router } from "express";
import { RedisManager } from "../RedisManager.js";
import { ON_RAMP } from "../types/index.js";

export const onRampRouter = Router();

onRampRouter.post("/", async (req, res) => {
  const { amount, userId, txnId } = req.body;

  if (!amount || !userId || !txnId) {
    return res.status(400).json({ error: "amount, userId and txnId are required" });
  }

  const result = await RedisManager.getInstances().sendAndAwait({
    type: ON_RAMP,
    data: {
      amount,
      userId,
      txnId,
    },
  });

  return res.json(result);
});
