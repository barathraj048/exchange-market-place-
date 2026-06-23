import { Router } from "express";
import { Client } from "pg";
export const tradeRoute = Router();
// Ensure your DB connection is initialized
const pgClient = new Client({
    user: 'your_user',
    host: '127.0.0.1',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});
// Connect once when the router loads
pgClient.connect().catch(err => console.error("Trade route DB connection error:", err));
tradeRoute.get("/", async (req, res) => {
    const market = req.query.market;
    const limit = Number(req.query.limit) || 50;
    if (!market) {
        return res.status(400).json({ success: false, message: "Market parameter is required" });
    }
    try {
        // Assuming the table name populated by your Redis worker is 'trades'
        // This fetches the most recent executed trades for your UI's "Recent Trades" list
        const query = `
      SELECT id, price, qty, timestamp, "buyerMarket", "quoteQuantity", market 
      FROM trades 
      WHERE market = $1 
      ORDER BY timestamp DESC 
      LIMIT $2;
    `;
        const result = await pgClient.query(query, [market, limit]);
        // Format to match standard exchange response
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (err) {
        console.error("Error fetching trades:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
//# sourceMappingURL=tradeRoute.js.map