import express from 'express';
import cors from 'cors';
import { orderRouter } from './routes/order';
import { depthRouter } from './routes/depthRoute';
import { tradeRoute } from './routes/tradeRoute';
import { tickerRoute } from './routes/tickerRoute';
import { klineData } from './routes/klineData';

const app = express();
let port=3000;

app.use(cors())
app.use(express.json())

app.use("/api/v1/order",orderRouter)
app.use("/api/v1/depth",depthRouter)
app.use("/api/v1/trade",tradeRoute)
app.use("/api/v1/ticker",tickerRoute)
app.use("/api/v1/kline",klineData)



app.listen(port,()=>{
      console.log(`Server is running on port ${port}`);
})