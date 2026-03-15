import type { Env } from "../types";
import { hashIP, getClientIP, json, error } from "../utils/auth";

export async function handleUpvote(
  request: Request,
  env: Env,
  blogId: number
): Promise<Response> {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip, env.UPVOTE_SALT_SECRET);

  // Check blog exists
  const blog = await env.DB.prepare("SELECT id, upvote_count FROM blogs WHERE id = ?")
    .bind(blogId)
    .first<{ id: number; upvote_count: number }>();

  if (!blog) {
    return error("Blog not found", 404);
  }

  // Try to insert upvote (unique constraint prevents duplicates)
  try {
    await env.DB.prepare(
      "INSERT INTO upvotes (blog_id, ip_hash) VALUES (?, ?)"
    )
      .bind(blogId, ipHash)
      .run();

    // Increment denormalized count
    await env.DB.prepare(
      "UPDATE blogs SET upvote_count = upvote_count + 1 WHERE id = ?"
    )
      .bind(blogId)
      .run();

    return json({ ok: true, upvote_count: blog.upvote_count + 1 });
  } catch (err: unknown) {
    // Duplicate vote — return current count
    if (
      err instanceof Error &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return json({ ok: true, upvote_count: blog.upvote_count, already_voted: true });
    }
    throw err;
  }
}
