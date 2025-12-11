// redisManager.ts
import { createClient, type RedisClientType } from "redis";
import { ADD_TRADE, ORDER_UPDATE } from "./types/index.js";

export class RedisManager {
  private client: RedisClientType;
  private static instance: RedisManager;

  private constructor() {
    this.client = createClient();
    // connect() returns a Promise — we call it and ignore awaiting here for simplicity,
    // but in production you should await connect during initialization.
    this.client.connect().catch((err) => {
      console.error("Redis connect error:", err);
    });
  }

  public static getInstance() {
    if (!this.instance) this.instance = new RedisManager();
    return this.instance;
  }

  public pushToDb(data: any) {
    this.client.lPush("db_process", JSON.stringify(data)).catch((e) => {
      console.error("pushToDb error", e);
    });
  }

  public publishTrade(channel: string, data: any) {
    this.client.publish(channel, JSON.stringify(data)).catch((e) => {
      console.error("publishTrade error", e);
    });
  }

  public publishToApi(clientId: string, data: any) {
    this.client.publish(clientId, JSON.stringify(data)).catch((e) => {
      console.error("publishToApi error", e);
    });
  }
}

export const redisManager = RedisManager.getInstance();
