import { createClient } from "redis";
import { Engine } from "./trades/engine.js";

async function start() {
    const engine = new Engine();
    const redisClient = createClient();
    await redisClient.connect();
    console.log("Engine Worker Started...");
    while (true) {
        const response = await redisClient.brPop("message", 0);
        if (response) {
            console.log("Processing order...");
            engine.process(JSON.parse(response.element));
        }
    }
}

start();