import movies from "../../../data/movies.json";
import games from "../../../data/games.json";
import books from "../../../data/books.json";
import music from "../../../data/music.json";
const catalogue = { movies, games, books, music };
const MAX_BODY = 12000;
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
const fail = (error, status = 400) => json({ ok: false, error }, status);
export function validateComment(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Invalid comment.";
  if (body.website) return "Comment could not be submitted.";
  if (
    typeof body.username !== "string" ||
    body.username.trim().length < 2 ||
    body.username.trim().length > 40
  )
    return "Display names must be 2–40 characters.";
  if (
    typeof body.body !== "string" ||
    body.body.trim().length < 2 ||
    body.body.trim().length > 2000
  )
    return "Comments must be 2–2000 characters.";
  if (
    !catalogue[body.content_type]?.some((item) => item.id === body.content_id)
  )
    return "This catalogue item does not exist.";
  if (
    body.parent_id != null &&
    (typeof body.parent_id !== "string" ||
      !/^[a-f0-9-]{36}$/.test(body.parent_id))
  )
    return "Invalid reply.";
  return null;
}
async function readBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    throw Error("size");
  const reader = request.body?.getReader();
  if (!reader) throw Error("json");
  const parts = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY) {
      await reader.cancel();
      throw Error("size");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function networkHash(request, env) {
  const address =
    request.headers.get("CF-Connecting-IP") || "local-development";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${env.RATE_LIMIT_SALT}:${day}:${address}`),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
async function allowed(db, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END, expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING count",
    )
    .bind(key, now + windowSeconds, now, now)
    .first();
  return result.count <= limit;
}
export async function onRequest({ request, env, params, waitUntil }) {
  if (!env.DB || !env.RATE_LIMIT_SALT)
    return fail("Discussion is temporarily unavailable.", 503);
  const url = new URL(request.url);
  const path = Array.isArray(params.path)
    ? params.path.filter(Boolean)
    : params.path
      ? [params.path]
      : [];
  try {
    if (request.method === "GET" && !path.length) {
      const id = url.searchParams.get("contentId"),
        type = url.searchParams.get("contentType");
      if (!catalogue[type]?.some((item) => item.id === id))
        return fail("This catalogue item does not exist.", 404);
      const { results } = await env.DB.prepare(
        "SELECT id, content_id, content_type, username, body, parent_id, created_at FROM comments WHERE content_id = ? AND content_type = ? AND approved = 1 ORDER BY created_at ASC, id ASC LIMIT 200",
      )
        .bind(id, type)
        .all();
      return json({ ok: true, data: results });
    }
    if (request.method !== "POST") return fail("Method not allowed.", 405);
    if (request.headers.get("Origin") !== url.origin)
      return fail("Request origin is not allowed.", 403);
    if (
      !request.headers
        .get("Content-Type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return fail("Expected JSON.", 415);
    let body;
    try {
      body = await readBody(request);
    } catch {
      return fail("Invalid or oversized request.", 400);
    }
    const hash = await networkHash(request, env);
    waitUntil(
      env.DB.batch([
        env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(
          Math.floor(Date.now() / 1000),
        ),
        env.DB.prepare(
          "DELETE FROM reports WHERE created_at < datetime('now', '-7 days')",
        ),
      ]).catch(() => {}),
    );
    if (!path.length) {
      const validation = validateComment(body);
      if (validation) return fail(validation);
      if (!(await allowed(env.DB, `comment:${hash}`, 5, 600)))
        return fail("Please wait a few minutes before posting again.", 429);
      if (body.parent_id) {
        const parent = await env.DB.prepare(
          "SELECT id, parent_id FROM comments WHERE id = ? AND content_id = ? AND content_type = ? AND approved = 1",
        )
          .bind(body.parent_id, body.content_id, body.content_type)
          .first();
        if (!parent || parent.parent_id)
          return fail("Replies must be to an approved top-level comment.");
      }
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO comments (id, content_id, content_type, username, body, parent_id, approved) VALUES (?, ?, ?, ?, ?, ?, 0)",
      )
        .bind(
          id,
          body.content_id,
          body.content_type,
          body.username.trim(),
          body.body.trim(),
          body.parent_id || null,
        )
        .run();
      return json(
        { ok: true, data: { id, approved: false, status: "pending" } },
        201,
      );
    }
    if (
      path.length === 2 &&
      path[1] === "report" &&
      /^[a-f0-9-]{36}$/.test(path[0])
    ) {
      if (!(await allowed(env.DB, `report:${hash}`, 10, 600)))
        return fail("Please wait before reporting again.", 429);
      const comment = await env.DB.prepare(
        "SELECT id FROM comments WHERE id = ? AND approved = 1",
      )
        .bind(path[0])
        .first();
      if (!comment) return fail("Comment not found.", 404);
      await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO reports (comment_id, reporter_hash) VALUES (?, ?)",
        ).bind(path[0], hash),
        env.DB.prepare(
          "UPDATE comments SET reported = 1, report_count = (SELECT COUNT(*) FROM reports WHERE comment_id = ?) WHERE id = ?",
        ).bind(path[0], path[0]),
      ]);
      return json({ ok: true, data: { reported: true } });
    }
    return fail("Not found.", 404);
  } catch {
    return fail("Discussion is temporarily unavailable.", 503);
  }
}
