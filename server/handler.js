import {
  providerInfo,
  providerOrigin,
  generateStored,
  modelResponse,
  ModelError,
} from "./models.js";
import { defaultCatalog } from "../src/lib/products.js";
import { validateCatalog } from "../src/lib/catalog.js";
import { defaultSettings, validateSettings } from "../src/lib/shop.js";
const COOKIE = "__Host-lunova_admin",
  SESSION_MS = 8 * 60 * 60 * 1000,
  WINDOW_MS = 15 * 60 * 1000,
  MAX_ATTEMPTS = 6;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
const sha = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const sameOrigin = (req) => {
  try {
    return req.headers.get("Origin") === new URL(req.url).origin;
  } catch {
    return false;
  }
};
const tokenFrom = (req) => {
  const cookie = (req.headers.get("Cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="));
  return cookie?.slice(COOKIE.length + 1) || "";
};
const clearCookie = () =>
  `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
const configured = (env) =>
  !!(env.DB && env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 6);
async function session(req, env) {
  const token = tokenFrom(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const row = await env.DB.prepare(
    "SELECT expires_at FROM admin_sessions WHERE token_hash = ?",
  )
    .bind(await sha(token + ":" + env.ADMIN_PASSWORD))
    .first();
  return !!row && row.expires_at > Date.now();
}
async function readStore(env) {
  const row = env.DB
    ? await env.DB.prepare(
        "SELECT catalog, settings, revision FROM store_config WHERE id = 1",
      ).first()
    : null;
  return row
    ? {
        catalog: validateCatalog(JSON.parse(row.catalog)),
        settings: validateSettings(JSON.parse(row.settings)),
        revision: row.revision,
      }
    : { catalog: defaultCatalog, settings: defaultSettings, revision: 0 };
}
async function readBody(req, max = 1800000) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Request body is required.");
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new Error("Request too large. Use smaller photos or image URLs.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Request must be a JSON object.");
  return value;
}
async function secureEqual(a, b) {
  const [x, y] = await Promise.all([sha(a), sha(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
export async function handleApi(req, env = {}) {
  const path = new URL(req.url).pathname;
  try {
    const modelPath = path.match(/^\/api\/models\/([a-f0-9]{64})\.glb$/);
    if (modelPath && req.method === "GET")
      return modelResponse(req, env, modelPath[1]);
    if (path.startsWith("/api/admin/models/")) {
      if (!configured(env))
        return json(
          {
            error: "Configure the CMS database and administrator secret first.",
          },
          503,
        );
      if (!(await session(req, env)))
        return json({ error: "Please log in as the administrator." }, 401);
      try {
        if (path === "/api/admin/models/status" && req.method === "GET") {
          const provider = await providerInfo(env);
          return json({
            ready: true,
            provider: "TripoSR on Hugging Face",
            space: provider.origin,
            authenticated: !!env.HF_TOKEN,
          });
        }
        if (path === "/api/admin/models/generate" && req.method === "POST") {
          if (!sameOrigin(req))
            return json({ error: "Request origin is not allowed." }, 403);
          const body = await readBody(req, 910000);
          return json(await generateStored(body.image, env));
        }
        return json({ error: "Not found." }, 404);
      } catch (e) {
        return json(
          {
            ready: false,
            error:
              e instanceof ModelError
                ? e.message
                : "The hosted 3D service could not be reached. Your photos are unchanged. Check Space availability and HF_TOKEN access; no paid fallback is used.",
          },
          e instanceof ModelError ? e.status : 503,
        );
      }
    }
    if (path === "/api/store" && req.method === "GET")
      return json({ ...(await readStore(env)), configured: configured(env) });
    if (path === "/api/admin/session" && req.method === "GET")
      return json({
        authenticated: configured(env) ? await session(req, env) : false,
        configured: configured(env),
      });
    if (path === "/api/admin/login" && req.method === "POST") {
      if (!configured(env))
        return json(
          {
            error:
              "Admin setup is incomplete. Connect the DB database and set the ADMIN_PASSWORD secret in Cloudflare.",
          },
          503,
        );
      if (!sameOrigin(req))
        return json({ error: "Request origin is not allowed." }, 403);
      let body;
      try {
        body = await readBody(req, 4096);
      } catch {
        return json({ error: "Enter a valid username and password." }, 400);
      }
      const { username, password } = body;
      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        username.length > 100 ||
        password.length > 512
      )
        return json({ error: "Invalid username or password." }, 401);
      const now = Date.now(),
        key = await sha(
          "login:" + (req.headers.get("CF-Connecting-IP") || "local"),
        );
      const limit = await env.DB.prepare(
        "INSERT INTO login_limits (key_hash, attempts, window_start) VALUES (?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END, window_start = CASE WHEN window_start < ? THEN ? ELSE window_start END RETURNING attempts, window_start",
      )
        .bind(key, now, now - WINDOW_MS, now - WINDOW_MS, now)
        .first();
      if (limit.attempts > MAX_ATTEMPTS)
        return json(
          { error: "Too many login attempts. Try again in 15 minutes." },
          429,
          { "Retry-After": "900" },
        );
      const [validName, validPass] = await Promise.all([
        secureEqual(username, env.ADMIN_USERNAME || "Admin"),
        secureEqual(password, env.ADMIN_PASSWORD),
      ]);
      if (!validName || !validPass)
        return json({ error: "Invalid username or password." }, 401);
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      await env.DB.batch([
        env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(
          now,
        ),
        env.DB.prepare("DELETE FROM login_limits WHERE window_start < ?").bind(
          now - WINDOW_MS,
        ),
        env.DB.prepare(
          "INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)",
        ).bind(await sha(token + ":" + env.ADMIN_PASSWORD), now + SESSION_MS),
        env.DB.prepare("DELETE FROM login_limits WHERE key_hash = ?").bind(key),
      ]);
      return json({ authenticated: true }, 200, {
        "Set-Cookie": `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`,
      });
    }
    if (path === "/api/admin/logout" && req.method === "POST") {
      if (!sameOrigin(req))
        return json({ error: "Request origin is not allowed." }, 403);
      if (env.DB) {
        const token = tokenFrom(req);
        if (token)
          await env.DB.prepare(
            "DELETE FROM admin_sessions WHERE token_hash = ?",
          )
            .bind(await sha(token + ":" + env.ADMIN_PASSWORD))
            .run();
      }
      return json({ authenticated: false }, 200, {
        "Set-Cookie": clearCookie(),
      });
    }
    if (
      path === "/api/admin/store" &&
      (req.method === "GET" || req.method === "PUT")
    ) {
      if (!configured(env))
        return json(
          {
            error:
              "Admin setup is incomplete. Connect the DB database and set the ADMIN_PASSWORD secret in Cloudflare.",
          },
          503,
        );
      if (!(await session(req, env)))
        return json({ error: "Please log in as the administrator." }, 401);
      if (req.method === "GET") return json(await readStore(env));
      if (!sameOrigin(req))
        return json({ error: "Request origin is not allowed." }, 403);
      let body, catalog, settings;
      try {
        body = await readBody(req);
        catalog = validateCatalog(body.catalog);
        settings = validateSettings(body.settings);
        if (!Number.isSafeInteger(body.revision) || body.revision < 0)
          throw new Error("Invalid store revision.");
      } catch (e) {
        return json({ error: e.message || "Invalid store data." }, 400);
      }
      const payload = JSON.stringify(catalog);
      if (new TextEncoder().encode(payload).length > 1500000)
        return json(
          { error: "Catalog is too large. Use smaller photos or image URLs." },
          413,
        );
      let result;
      if (body.revision === 0)
        result = await env.DB.prepare(
          "INSERT OR IGNORE INTO store_config (id,catalog,settings,revision,updated_at) VALUES (1,?,?,1,?)",
        )
          .bind(payload, JSON.stringify(settings), Date.now())
          .run();
      else
        result = await env.DB.prepare(
          "UPDATE store_config SET catalog = ?,settings = ?,revision = revision + 1,updated_at = ? WHERE id = 1 AND revision = ?",
        )
          .bind(payload, JSON.stringify(settings), Date.now(), body.revision)
          .run();
      if (result.meta.changes !== 1)
        return json(
          {
            error:
              "The store changed in another session. Reload the admin panel before saving again.",
          },
          409,
        );
      return json({ catalog, settings, revision: body.revision + 1 });
    }
    return json({ error: "Not found." }, 404);
  } catch {
    return json(
      {
        error:
          "The CMS database is unavailable or its tables are missing. Check the database binding and run the setup migration.",
      },
      503,
    );
  }
}
