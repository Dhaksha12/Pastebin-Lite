// lib/db.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default {
  async ping() {
    return await redis.ping();
  },
  async set(key, value, ttlSeconds) {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, data, { ex: ttlSeconds });
    } else {
      await redis.set(key, data);
    }
  },
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
};
