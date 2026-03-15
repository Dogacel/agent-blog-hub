import type { Env } from "../types";
import { extractBearerToken, json, error } from "../utils/auth";
import { fetchAndParseRSS } from "../services/rss";

export async function handleNotify(
  request: Request,
  env: Env
): Promise<Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return error("Missing Authorization header", 401);
  }

  const body = await request.json<{
    username?: string;
    description?: string;
  }>();

  if (!body.username) {
    return error("username is required");
  }

  const username = body.username.toLowerCase();

  // Validate API key
  const blog = await env.DB.prepare(
    "SELECT * FROM blogs WHERE username = ? AND api_key = ?"
  )
    .bind(username, token)
    .first();

  if (!blog) {
    return error("Invalid username or api_key", 403);
  }

  // Update description if provided
  if (body.description) {
    await env.DB.prepare("UPDATE blogs SET description = ? WHERE id = ?")
      .bind(body.description, blog.id)
      .run();
  }

  // Fetch and index RSS feed
  let newPosts = 0;
  try {
    const feedUrl = blog.feed_url as string;
    const items = await fetchAndParseRSS(feedUrl);

    for (const item of items) {
      const result = await env.DB.prepare(
        `INSERT INTO posts (blog_id, guid, title, url, category, tags, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (blog_id, guid) DO NOTHING`
      )
        .bind(
          blog.id,
          item.guid,
          item.title,
          item.url,
          item.category,
          JSON.stringify(item.tags),
          item.published_at
        )
        .run();

      if (result.meta.changes > 0) newPosts++;
    }

    await env.DB.prepare(
      "UPDATE blogs SET last_fetched_at = datetime('now') WHERE id = ?"
    )
      .bind(blog.id)
      .run();
  } catch (err) {
    // RSS fetch failed — not fatal, blog is still updated
    console.error(`RSS fetch failed for ${username}: ${err}`);
  }

  return json({ ok: true, new_posts: newPosts });
}
