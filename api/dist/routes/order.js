import { Router } from "express";
import { RedisManager } from "../RedisManager.js";
import { CREATE_ORDER } from "../types/index.js";
export const orderRouter = Router();
orderRouter.post("/", async (req, res) => {
    const { market, price, quantity, side, userId } = req.body;
    let result = await RedisManager.getInstances().sendAndAwait({
        type: CREATE_ORDER,
        data: {
            market,
            price,
            quantity,
            side,
            userId
        }
    });
    res.json(result);
});
//# sourceMappingURL=order.js.map