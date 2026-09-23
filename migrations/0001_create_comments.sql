PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY,
 content_id TEXT NOT NULL,
 content_type TEXT NOT NULL CHECK (content_type IN ('movies','games','books','music')),
 username TEXT NOT NULL CHECK (length(username) BETWEEN 2 AND 40),
 body TEXT NOT NULL CHECK (length(body) BETWEEN 2 AND 2000),
 parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1)),
 reported INTEGER NOT NULL DEFAULT 0 CHECK (reported IN (0,1)),
 report_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reports (
 comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
 reporter_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (comment_id, reporter_hash)
);
