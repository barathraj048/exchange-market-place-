import { Router } from "express";

export const tracsactionRoute = Router();

tracsactionRoute.get("/",async (req, res) => {
    res.json({message:"Transaction route is working"});
});