import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.TEST_API_URL || "http://localhost:8788";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("This test only runs against a local database.");
const wrangler = process.env.WRANGLER_PATH || "wrangler";
const sql = (command) =>
  execFileSync(
    wrangler,
    ["d1", "execute", "common-room-comments", "--local", "--command", command],
    { stdio: "pipe" },
  );
const ids = [];
const payload = {
  content_id: "signal-garden",
  content_type: "games",
  username: "Integration test",
  body: "<script>unsafeMarkup()</script>",
};
async function post(path, body, origin = base) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
const list = async () => {
  const r = await fetch(
    base + "/api/comments?contentId=signal-garden&contentType=games",
  );
  assert.equal(r.status, 200);
  return (await r.json()).data;
};
try {
  sql("DELETE FROM rate_limits;");
  assert.equal(
    (await post("/api/comments", { ...payload, body: " " })).status,
    400,
  );
  assert.equal(
    (await post("/api/comments", { ...payload, username: " " })).status,
    400,
  );
  assert.equal(
    (await post("/api/comments", { ...payload, body: "x".repeat(2001) }))
      .status,
    400,
  );
  assert.equal(
    (await post("/api/comments", { ...payload, website: "spam" })).status,
    400,
  );
  assert.equal(
    (await post("/api/comments", { ...payload, content_id: "missing" })).status,
    400,
  );
  assert.equal(
    (await post("/api/comments", payload, "https://untrusted.example")).status,
    403,
  );
  assert.equal(
    (await post("/api/comments", { ...payload, body: "x".repeat(13000) }))
      .status,
    400,
  );
  const parent = await post("/api/comments", payload);
  assert.equal(parent.status, 201);
  assert.equal(parent.body.data.approved, false);
  const id = parent.body.data.id;
  ids.push(id);
  assert.equal(
    (await list()).some((c) => c.id === id),
    false,
  );
  sql(`UPDATE comments SET approved = 1 WHERE id = '${id}';`);
  assert.equal((await list()).find((c) => c.id === id).body, payload.body);
  const reply = await post("/api/comments", {
    ...payload,
    parent_id: id,
    body: "A real test reply.",
  });
  assert.equal(reply.status, 201);
  ids.push(reply.body.data.id);
  sql(`UPDATE comments SET approved = 1 WHERE id = '${reply.body.data.id}';`);
  const nested = await post("/api/comments", {
    ...payload,
    parent_id: reply.body.data.id,
  });
  assert.equal(nested.status, 400);
  const cross = await post("/api/comments", {
    ...payload,
    content_id: "New-West-Those-Eyes",
    content_type: "music",
    parent_id: id,
  });
  assert.equal(cross.status, 400);
  assert.equal((await post(`/api/comments/${id}/report`, {})).status, 200);
  assert.equal((await post(`/api/comments/${id}/report`, {})).status, 200);
  const reportQuery = sql(
    `SELECT report_count FROM comments WHERE id = '${id}';`,
  ).toString();
  assert.match(reportQuery, /"report_count": 1/);
  const fifth = await post("/api/comments", {
    ...payload,
    body: "Rate limit sample.",
  });
  assert.equal(fifth.status, 201);
  ids.push(fifth.body.data.id);
  assert.equal((await post("/api/comments", payload)).status, 429);
  sql(`UPDATE comments SET approved = 0 WHERE id = '${id}';`);
  assert.equal(
    (await list()).some((c) => c.id === id),
    false,
  );
  console.log(
    "API checks passed: D1 writes/reads, pending moderation, approval/hiding, replies/depth/content boundaries, report deduplication, validation, origin protection, payload bounds, honeypot, and rate limits.",
  );
} finally {
  for (const id of ids) sql(`DELETE FROM comments WHERE id = '${id}';`);
  sql("DELETE FROM rate_limits;");
}
