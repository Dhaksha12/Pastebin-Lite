import { redis } from "../../utils/redis";


export default async function handler(req, res) {
  try {
    // ping ensures persistence layer is reachable
    await redis.ping();
    res.status(200).json({ ok: true });
  } catch {
    // Still JSON, but indicates persistence issue
    res.status(200).json({ ok: false });
  }
}
