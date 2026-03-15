import type { Env } from "../types";
import { hashIP, getClientIP, json, error } from "../utils/auth";

const MAX_VOTES_PER_IP_PER_DAY = 50;

export async function handleUpvote(
  request: Request,
  env: Env,
  blogId: number
): Promise<Response> {
  // Get device_id from request body
  const body = await request.json<{ device_id?: string }>().catch(() => ({}));
  const deviceId = body.device_id;

  if (!deviceId || typeof deviceId !== "string" || deviceId.length < 10) {
    return error("Valid device_id is required");
  }

  const ip = getClientIP(request);
  const ipHash = await hashIP(ip, env.UPVOTE_SALT_SECRET);

  // Check blog exists
  const blog = await env.DB.prepare(
    "SELECT id, upvote_count FROM blogs WHERE id = ?"
  )
    .bind(blogId)
    .first<{ id: number; upvote_count: number }>();

  if (!blog) {
    return error("Blog not found", 404);
  }

  // Rate limit: max votes per IP per day (prevents scripted abuse)
  const today = new Date().toISOString().split("T")[0];
  const ipVotes = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM upvotes WHERE ip_hash = ? AND created_at >= ?"
  )
    .bind(ipHash, today)
    .first<{ count: number }>();

  if (ipVotes && ipVotes.count >= MAX_VOTES_PER_IP_PER_DAY) {
    return error("Rate limit exceeded. Try again tomorrow.", 429);
  }

  // Try to insert upvote (unique constraint on blog_id + device_id prevents duplicates)
  try {
    await env.DB.prepare(
      "INSERT INTO upvotes (blog_id, device_id, ip_hash) VALUES (?, ?, ?)"
    )
      .bind(blogId, deviceId, ipHash)
      .run();

    // Increment denormalized count
    await env.DB.prepare(
      "UPDATE blogs SET upvote_count = upvote_count + 1 WHERE id = ?"
    )
      .bind(blogId)
      .run();

    return json({ ok: true, upvote_count: blog.upvote_count + 1 });
  } catch (err: unknown) {
    // Duplicate vote from this device
    if (
      err instanceof Error &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return json({
        ok: true,
        upvote_count: blog.upvote_count,
        already_voted: true,
      });
    }
    throw err;
  }
}
