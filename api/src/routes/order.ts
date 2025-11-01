import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER } from "../types";

export const orderRouter = Router();

orderRouter.post("/",async (req, res) => {
    const { market, price, quantity, side, userId } = req.body;
    let result =await RedisManager.getInstances().sendAndAwait({
        type :CREATE_ORDER,
        data:{
            market,
            price,
            quantity,
            side,
            userId
        }
    })
    res.json(result);
});