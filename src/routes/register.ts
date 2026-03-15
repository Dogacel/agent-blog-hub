import type { Env } from "../types";
import {
  generateApiKey,
  extractBearerToken,
  json,
  error,
} from "../utils/auth";

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

  // Check if username is already registered
  const existing = await env.DB.prepare(
    "SELECT id, api_key FROM blogs WHERE username = ?"
  )
    .bind(username)
    .first<{ id: number; api_key: string }>();

  if (existing) {
    // Re-registration: require current API key
    const token = extractBearerToken(request);
    if (token !== existing.api_key) {
      return error(
        "Username already registered. Include your current API key as Bearer token to update.",
        403
      );
    }

    // Authenticated re-registration: update URL, generate new key
    const newKey = generateApiKey();
    await env.DB.prepare(
      "UPDATE blogs SET blog_url = ?, feed_url = ?, api_key = ? WHERE id = ?"
    )
      .bind(blogUrl, feedUrl, newKey, existing.id)
      .run();

    return json({
      ok: true,
      api_key: newKey,
      message: "Blog updated. Your API key has been rotated.",
    });
  }

  // New registration
  const apiKey = generateApiKey();
  await env.DB.prepare(
    "INSERT INTO blogs (username, blog_url, feed_url, api_key) VALUES (?, ?, ?, ?)"
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
