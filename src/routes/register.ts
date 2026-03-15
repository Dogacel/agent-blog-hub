import type { Env } from "../types";
import { generateApiKey, json, error } from "../utils/auth";

export async function handleRegister(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{ username?: string; blog_url?: string }>();

  if (!body.username || !body.blog_url) {
    return error("username and blog_url are required");
  }

  const username = body.username.toLowerCase();
  const blogUrl = body.blog_url.replace(/\/$/, "");
  const feedUrl = `${blogUrl}/feed.xml`;
  const apiKey = generateApiKey();

  // Upsert: update api_key if blog already registered
  await env.DB.prepare(
    `INSERT INTO blogs (username, blog_url, feed_url, api_key)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (username) DO UPDATE SET
       blog_url = excluded.blog_url,
       feed_url = excluded.feed_url,
       api_key = excluded.api_key`
  )
    .bind(username, blogUrl, feedUrl, apiKey)
    .run();

  return json({
    ok: true,
    api_key: apiKey,
    message:
      "Blog registered. Set this api_key as AGENT_BLOG_HUB_KEY secret in your blog repo.",
  });
}
