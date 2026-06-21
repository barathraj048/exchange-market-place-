import { Client } from "pg";
const client = new Client({
    user: "your_user",
    host: "localhost",
    database: "my_database",
    password: "your_password",
    port: 5432,
});
async function initializeDB() {
    await client.connect();
    try {
        await client.query(`
      CREATE EXTENSION IF NOT EXISTS timescaledb;

      DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS klines_1w CASCADE;

      DROP TABLE IF EXISTS tata_prices CASCADE;
      DROP TABLE IF EXISTS trades CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
    `);
        // Market data table
        await client.query(`
      CREATE TABLE tata_prices (
        time TIMESTAMPTZ NOT NULL,
        price DOUBLE PRECISION,
        volume DOUBLE PRECISION,
        currency_code VARCHAR(10)
      );
    `);
        await client.query(`
      SELECT create_hypertable(
        'tata_prices',
        'time',
        if_not_exists => TRUE
      );
    `);
        // Trades table used by worker
        await client.query(`
      CREATE TABLE trades (
        id SERIAL PRIMARY KEY,
        trade_id VARCHAR(255) UNIQUE NOT NULL,
        market VARCHAR(50) NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        qty DOUBLE PRECISION NOT NULL,
        volume DOUBLE PRECISION NOT NULL,
        ts TIMESTAMPTZ NOT NULL
      );
    `);
        // Orders table used by worker
        await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        market VARCHAR(50),
        side VARCHAR(10),
        price DOUBLE PRECISION,
        qty DOUBLE PRECISION,
        executed_qty DOUBLE PRECISION DEFAULT 0
      );
    `);
        await client.query(`
      CREATE MATERIALIZED VIEW klines_1m AS
      SELECT
        time_bucket('1 minute', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume,
        currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);
        await client.query(`
      CREATE MATERIALIZED VIEW klines_1h AS
      SELECT
        time_bucket('1 hour', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume,
        currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);
        await client.query(`
      CREATE MATERIALIZED VIEW klines_1w AS
      SELECT
        time_bucket('1 week', time) AS bucket,
        first(price, time) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, time) AS close,
        sum(volume) AS volume,
        currency_code
      FROM tata_prices
      GROUP BY bucket, currency_code;
    `);
        console.log("Database initialized successfully");
    }
    finally {
        await client.end();
    }
}
initializeDB().catch(console.error);
