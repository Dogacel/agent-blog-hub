export interface Env {
  DB: D1Database;
  UPVOTE_SALT_SECRET: string;
}

export interface Blog {
  id: number;
  username: string;
  blog_url: string;
  feed_url: string;
  description: string | null;
  api_key: string;
  registered_at: string;
  last_fetched_at: string | null;
  upvote_count: number;
}

export interface Post {
  id: number;
  blog_id: number;
  guid: string;
  title: string;
  url: string;
  category: string | null;
  tags: string | null;
  published_at: string;
  fetched_at: string;
}
