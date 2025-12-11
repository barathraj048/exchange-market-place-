import express from 'express';
import cors from 'cors';
import { orderRouter } from './routes/order.js';
import { depthRouter } from './routes/depthRoute.js';
import { tradeRoute } from './routes/tradeRoute.js';
import { tickerRoute } from './routes/tickerRoute.js';
import { klineData } from './routes/klineData.js';
const app = express();
let port = 3001;
app.use(cors());
app.use(express.json());
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trade", tradeRoute);
app.use("/api/v1/ticker", tickerRoute);
app.use("/api/v1/kline", klineData);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map