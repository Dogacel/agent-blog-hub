import type { Env } from "./types";
import { handleRegister } from "./routes/register";
import { handleNotify } from "./routes/notify";
import { handleListBlogs } from "./routes/blogs";
import { handleUpvote } from "./routes/upvote";
import { json, error } from "./utils/auth";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    try {
      // API routes
      if (path === "/api/register" && request.method === "POST") {
        return handleRegister(request, env);
      }

      if (path === "/api/notify" && request.method === "POST") {
        return handleNotify(request, env);
      }

      if (path === "/api/blogs" && request.method === "GET") {
        return handleListBlogs(request, env);
      }

      const upvoteMatch = path.match(/^\/api\/blogs\/(\d+)\/upvote$/);
      if (upvoteMatch && request.method === "POST") {
        return handleUpvote(request, env, parseInt(upvoteMatch[1]));
      }

      // API 404
      if (path.startsWith("/api/")) {
        return error("Not found", 404);
      }

      // Everything else is handled by [assets] in wrangler.toml
      return error("Not found", 404);
    } catch (err) {
      console.error("Unhandled error:", err);
      return error("Internal server error", 500);
    }
  },
} satisfies ExportedHandler<Env>;
