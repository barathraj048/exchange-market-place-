import { Router } from "express";
import { Client } from "pg";
export let klineData = Router();
const pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password@123',
    database: 'exchange',
});
klineData.get("/", async (req, res) => {
    let { duration, market, intravel, startTime, endTime } = req.query;
    let query;
    switch (duration) {
        case "1m":
            query = `select * from kline_1m where bucket>=$1 AND busket<=$2;`;
            break;
        case "1h":
            query = `select * from kline_5h where bucket>=$1 AND busket<=$2;`;
            break;
        case "1w":
            query = `select * from kline_1w where bucket>=$1 AND busket<=$2;`;
            break;
        default:
            console.log("invalid duration celect duration of 1m,1h,1w");
            return res.status(400).json({ message: "invalid duration" });
    }
    try {
        //@ts-ignore
        let result = await pgClient.query(query, [new Date((startTime * 1000).toString()), new Date((endTime * 1000).toString())]);
        res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume,
            start: x.start,
            trades: x.trades,
            volume: x.volume,
        })));
    }
    catch (err) {
        console.log("error fetching klinedata", err);
        res.status(500).json({ message: "internal server error" });
    }
});
//# sourceMappingURL=klineData.js.map