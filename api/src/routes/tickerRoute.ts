import { Router } from "express";

export const tickerRoute = Router();

tickerRoute.get("/",async (req, res) => {
    res.json({message:"Depth route is working"});
});