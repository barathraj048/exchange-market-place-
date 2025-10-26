import express from 'express';
import cors from 'cors';
import { orderRouter } from './routes/order';

const app = express();
let port=3000;

app.use(cors())
app.use(express.json())

app.use("/api/v1/order",orderRouter)



app.listen(port,()=>{
      console.log(`Server is running on port ${port}`);
})