import { Router } from "express";
import { RedisManager } from "../RedisManager";

export let klineData = Router();

klineData.get("/", async (req, res) => {
    res.json({ message: "Depth route is under construction." });
});