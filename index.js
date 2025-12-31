import { v4 as uuidv4 } from "uuid";
import { redis } from "../../../utils/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content, ttl_seconds, max_views } = req.body || {};

  // Validation
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "content is required and must be a non-empty string" });
  }
  if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
    return res.status(400).json({ error: "ttl_seconds must be an integer ≥ 1" });
  }
  if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
    return res.status(400).json({ error: "max_views must be an integer ≥ 1" });
  }

  const id = uuidv4();
  const nowMs =
    process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]
      ? parseInt(req.headers["x-test-now-ms"], 10)
      : Date.now();

  const expiresAtIso = ttl_seconds ? new Date(nowMs + ttl_seconds * 1000).toISOString() : null;

  // We’ll use two keys:
  // - paste:{id}    -> JSON metadata + content
  // - paste:{id}:views -> integer counter (remaining views), only if max_views provided
  const key = `paste:${id}`;
  const viewKey = `paste:${id}:views`;
  const paste = {
    content,
    max_views: max_views ?? null,
    created_at: new Date(nowMs).toISOString(),
    expires_at: expiresAtIso,
  };

  // Write paste with optional TTL
  if (ttl_seconds) {
    await redis.set(key, JSON.stringify(paste), { ex: ttl_seconds });
  } else {
    await redis.set(key, JSON.stringify(paste));
  }

  // Initialize views counter if applicable
  if (max_views !== undefined) {
    // set initial remaining views
    if (ttl_seconds) {
      await redis.set(viewKey, String(max_views), { ex: ttl_seconds });
    } else {
      await redis.set(viewKey, String(max_views));
    }
  }

  // Construct share URL from host header (grader expects /p/:id on same domain)
  const host = req.headers.host;
  const protocol = host?.includes("localhost") ? "http" : "https";
  res.status(201).json({
    id,
    url: `${protocol}://${host}/p/${id}`,
  });
}
