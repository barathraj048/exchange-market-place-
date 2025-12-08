import { Client } from 'pg';

let client = new Client({
    user: 'postgres',              
    host: 'localhost',
    database: 'exchange_db',       
    password: 'password@123',      
    port: 5432,
});

async function refreshViews() {
    try {
        await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1m');
        await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1h');
        await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1w');

        console.log("Materialized views refreshed successfully");
    } catch (err) {
        console.error("Error refreshing:", err);
    }
}

async function start() {
    await client.connect();

    // First run immediately
    await refreshViews();

    // Repeat every 10 seconds
    setInterval(refreshViews, 10_000);
}

start().catch(console.error);




