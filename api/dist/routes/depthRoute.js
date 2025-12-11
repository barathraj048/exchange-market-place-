import { Router } from "express";
import { GET_DEPTH } from "../types/index.js";
import { RedisManager } from "../RedisManager.js";
export let depthRouter = Router();
depthRouter.get("/", async (req, res) => {
    let symblol = req.body.market;
    let result = await RedisManager.getInstances().sendAndAwait({
        type: GET_DEPTH,
        data: {
            market: symblol
        }
    });
    res.json(result);
});
//# sourceMappingURL=depthRoute.js.map