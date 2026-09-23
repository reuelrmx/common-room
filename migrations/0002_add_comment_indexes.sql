CREATE INDEX IF NOT EXISTS comments_catalogue ON comments(content_id, content_type, approved, created_at);
CREATE INDEX IF NOT EXISTS comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS comments_moderation ON comments(approved, reported, created_at);
CREATE INDEX IF NOT EXISTS comments_created ON comments(created_at);
CREATE INDEX IF NOT EXISTS rate_limit_expiry ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS report_expiry ON reports(created_at);
