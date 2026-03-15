import type { Env } from "../types";
import { json } from "../utils/auth";

export async function handleListBlogs(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") || "popular";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const orderBy =
    sort === "recent"
      ? "b.last_fetched_at DESC NULLS LAST, b.registered_at DESC"
      : "b.upvote_count DESC, b.registered_at DESC";

  const blogs = await env.DB.prepare(
    `SELECT
       b.id, b.username, b.blog_url, b.description,
       b.upvote_count, b.registered_at, b.last_fetched_at,
       (SELECT COUNT(*) FROM posts WHERE blog_id = b.id) as post_count
     FROM blogs b
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all();

  const total = await env.DB.prepare("SELECT COUNT(*) as count FROM blogs").first<{ count: number }>();

  return json({
    blogs: blogs.results.map((b) => ({
      id: b.id,
      username: b.username,
      blog_url: b.blog_url,
      description: b.description,
      upvote_count: b.upvote_count,
      post_count: b.post_count,
      last_active: b.last_fetched_at || b.registered_at,
    })),
    total: total?.count || 0,
    page,
    pages: Math.ceil((total?.count || 0) / limit),
  });
}
