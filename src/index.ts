import { createStorage } from "./storage";
import { broadcast, addClient, removeClient } from "./sse";
import {
  isAuthenticated,
  loginPage,
  hashPassword,
  AUTH_COOKIE_NAME,
} from "./auth";
import { dashboard } from "./dashboard";

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 512 * 1024;
const MAX_EVENTS = Number(process.env.MAX_EVENTS) || 200;
const PASSWORD = process.env.PASSWORD || "";
const STORAGE_TYPE = (process.env.STORAGE as "memory" | "sqlite") || "memory";

const storage = createStorage({
  type: STORAGE_TYPE,
  maxEvents: MAX_EVENTS,
  dbPath: process.env.DB_PATH,
});

const dashboardHtml = dashboard(!!PASSWORD);

function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return Response.json(data, { status, headers });
}

function requireAuth(req: Request): Response | null {
  if (!PASSWORD) return null;
  if (isAuthenticated(req, PASSWORD)) return null;
  return json({ error: "Unauthorized" }, 401);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = req.method;

    if (path === "/login" && method === "POST") {
      const form = await req.formData().catch(() => null);
      const pw = form?.get("password")?.toString() || "";
      if (pw === PASSWORD && PASSWORD) {
        const token = hashPassword(PASSWORD);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
          },
        });
      }
      return new Response(loginPage(true), {
        status: 401,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (path === "/" && method === "GET") {
      if (PASSWORD && !isAuthenticated(req, PASSWORD)) {
        return new Response(loginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response(dashboardHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (path === "/events" && method === "GET") {
      const denied = requireAuth(req);
      if (denied) return denied;
      return json({ events: storage.list() });
    }

    if (
      path === "/events" &&
      (method === "POST" || method === "PUT" || method === "PATCH")
    ) {
      const denied = requireAuth(req);
      if (denied) return denied;

      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > MAX_BODY_BYTES) {
        return json({ error: "Payload too large" }, 413);
      }

      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) {
        return json({ error: "Payload too large" }, 413);
      }

      const contentType = (
        req.headers.get("content-type") || ""
      ).toLowerCase();
      let body: string | object | null;
      if (contentType.includes("application/json")) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = Object.fromEntries(new URLSearchParams(raw));
      } else {
        body = raw;
      }

      const headers = Object.fromEntries(
        [...req.headers.entries()].filter(
          ([k]) => k !== "host" && k !== "connection" && k !== "authorization"
        )
      );
      const query = Object.fromEntries(url.searchParams);

      const event = storage.push({
        method,
        path: url.pathname + url.search,
        headers,
        query,
        body,
      });
      broadcast(event);
      return json({ received: true, id: event.id });
    }

    if (path === "/events" && method === "DELETE") {
      const denied = requireAuth(req);
      if (denied) return denied;
      storage.clear();
      return json({ cleared: true });
    }

    if (path === "/stream" && method === "GET") {
      const denied = requireAuth(req);
      if (denied) return denied;

      let controller!: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          addClient(c);
          c.enqueue(": connected\n\n");
        },
        cancel() {
          removeClient(controller);
        },
      });

      req.signal.addEventListener("abort", () => removeClient(controller));

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (path === "/logout" && method === "GET") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`,
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(
  `PBXware Event Catcher running on http://localhost:${server.port}`
);
console.log(`  Storage: ${STORAGE_TYPE}`);
console.log(`  Auth: ${PASSWORD ? "enabled" : "disabled"}`);
