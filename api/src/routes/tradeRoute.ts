import { Router } from "express";

export const tradeRoute = Router();

tradeRoute.get("/",async (req, res) => {
    res.json({message:"Depth route is working"});
});