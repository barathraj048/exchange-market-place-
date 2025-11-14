import { Client } from 'pg';
import { createClient } from 'redis';
import { MessageFromEngine } from './type';

const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});
pgClient.connect();

async function main() {
    const redisClient = createClient();
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.rPop("db_process"); 
        if (!response) continue;

        const data: MessageFromEngine = JSON.parse(response);

        if (data.type === "ADD_TRADE") {
            console.log("DB: storing trade");

            const price = Number(data.data.price);
            const qty = Number(data.data.qty);
            const volume = Number(data.data.quoteQuantity);
            const ts = new Date(data.data.timestamp);

            await pgClient.query(
                `INSERT INTO trades (market, price, qty, volume, ts, trade_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [data.data.market, price, qty, volume, ts, data.data.id]
            );
        }

        else if (data.type === "ADD_ORDER") {
            console.log("DB: storing order");

            await pgClient.query(
                `INSERT INTO orders (market, side, price, qty, order_id, executed_qty)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    data.data.market,
                    data.data.side,
                    Number(data.data.price),
                    Number(data.data.quantity),
                    data.data.orderId,
                    Number(data.data.executedQuantity)
                ]
            );
        }
    }
}

main();
