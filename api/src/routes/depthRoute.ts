import { Router } from "express";
import { GET_DEPTH } from "../types";
import { RedisManager } from "../RedisManager";

export let depthRouter = Router();

depthRouter.get("/",async (req, res) => {
    let symblol = req.body.market;
    let result = await RedisManager.getInstances().sendAndAwait({
        type:GET_DEPTH,
        data:{ 
            market: symblol as string
         }})
    res.json(result);
});