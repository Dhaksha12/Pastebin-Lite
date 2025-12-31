import { redis } from "../../utils/redis";

export async function getServerSideProps(context) {
  const { id } = context.params;
  const key = `paste:${id}`;
  const viewKey = `paste:${id}:views`;

  const raw = await redis.get(key);
  if (!raw) {
    return { notFound: true };
  }

  const paste = JSON.parse(raw);

  const nowMs =
    process.env.TEST_MODE === "1" && context.req.headers["x-test-now-ms"]
      ? parseInt(context.req.headers["x-test-now-ms"], 10)
      : Date.now();

  if (paste.expires_at && nowMs > new Date(paste.expires_at).getTime()) {
    await Promise.all([redis.del(key), redis.del(viewKey)]);
    return { notFound: true };
  }

  let remainingViews = null;
  if (paste.max_views !== null) {
    const existing = await redis.get(viewKey);
    if (existing === null) {
      await redis.set(viewKey, String(paste.max_views));
    }

    remainingViews = await redis.decr(viewKey);

    if (remainingViews < 0) {
      await Promise.all([redis.del(key), redis.del(viewKey)]);
      return { notFound: true };
    }

    if (remainingViews === 0) {
      await Promise.all([redis.del(key), redis.del(viewKey)]);
    }
  }

  // React escapes strings by default; render as plain text inside <pre>
  return {
    props: {
      content: paste.content,
    },
  };
}

export default function PastePage({ content }) {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Paste</h1>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1rem",
          background: "#fafafa",
        }}
      >
        {content}
      </pre>
    </div>
  );
}
