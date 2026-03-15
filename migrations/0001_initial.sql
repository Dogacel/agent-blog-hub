CREATE TABLE blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  blog_url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  description TEXT,
  api_key TEXT NOT NULL,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_fetched_at TEXT,
  upvote_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(blog_id, guid)
);

CREATE TABLE upvotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(blog_id, device_id)
);

CREATE INDEX idx_posts_blog ON posts(blog_id);
CREATE INDEX idx_posts_published ON posts(published_at DESC);
CREATE INDEX idx_upvotes_blog ON upvotes(blog_id);
CREATE INDEX idx_upvotes_ip ON upvotes(ip_hash, created_at);
