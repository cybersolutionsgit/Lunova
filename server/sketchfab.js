import {
  searchParameters,
  modelSummary,
  uid,
  creditText,
} from "../src/lib/sketchfab.js";
const API = "https://api.sketchfab.com/v3",
  OAUTH = "https://sketchfab.com/oauth2",
  COOKIE = "__Secure-lunova_sketchfab";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
function redirectUri(req, env) {
  const url = new URL(env.SKETCHFAB_REDIRECT_URI || "");
  if (
    url.protocol !== "https:" ||
    url.origin !== new URL(req.url).origin ||
    url.pathname !== "/api/sketchfab/callback" ||
    url.search ||
    url.hash
  )
    throw new Error("Set the exact HTTPS Sketchfab callback for this site.");
  return url.href;
}
function ready(env) {
  return !!(
    env.SKETCHFAB_CLIENT_ID &&
    env.SKETCHFAB_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/.test(env.SKETCHFAB_TOKEN_KEY || "")
  );
}
async function key(env) {
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(
      env.SKETCHFAB_TOKEN_KEY.match(/../g).map((x) => parseInt(x, 16)),
    ),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptToken(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    bytes = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode("lunova-sketchfab-v1"),
      },
      await key(env),
      new TextEncoder().encode(value),
    );
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(bytes)),
  });
}
async function decryptToken(value, env) {
  const data = JSON.parse(value);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(data.iv),
        additionalData: new TextEncoder().encode("lunova-sketchfab-v1"),
      },
      await key(env),
      new Uint8Array(data.data),
    ),
  );
}
async function upstream(url, options = {}, fetcher) {
  let response;
  try {
    response = await fetcher(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Sketchfab could not be reached. Check network access and try again.",
    );
  }
  if (!response.ok) {
    const e = new Error(
      response.status === 429
        ? "Sketchfab rate limit reached. Try again later."
        : `Sketchfab rejected the request (${response.status}). Reconnect if authorization has expired.`,
    );
    e.status = response.status === 429 ? 429 : 502;
    throw e;
  }
  return response.json();
}
function bounce(message) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/?sketchfab=${message}`,
      "Set-Cookie": `${COOKIE}=; Path=/api/sketchfab/callback; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export async function handleSketchfab(
  req,
  env,
  { sessionHash } = {},
  fetcher = fetch,
) {
  const url = new URL(req.url),
    action = url.pathname.split("/").pop();
  try {
    if (url.pathname === "/api/sketchfab/callback" && req.method === "GET") {
      if (!ready(env)) return bounce("setup-required");
      const state = url.searchParams.get("state") || "",
        nonce =
          (req.headers.get("Cookie") || "")
            .split(";")
            .map((s) => s.trim())
            .find((s) => s.startsWith(COOKIE + "="))
            ?.slice(COOKIE.length + 1) || "";
      if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(nonce))
        return bounce("invalid-state");
      const row = await env.DB.prepare(
        "DELETE FROM sketchfab_oauth_states WHERE state_hash=? AND nonce_hash=? AND expires_at>? AND session_hash IN (SELECT token_hash FROM admin_sessions WHERE expires_at>?) RETURNING session_hash",
      )
        .bind(
          await hash(state + ":" + env.ADMIN_PASSWORD),
          await hash(nonce),
          Date.now(),
          Date.now(),
        )
        .first();
      if (!row) return bounce("expired-state");
      if (url.searchParams.has("error")) return bounce("authorization-denied");
      const code = url.searchParams.get("code");
      if (!code || code.length > 2048) return bounce("missing-code");
      const token = await upstream(
        OAUTH + "/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.SKETCHFAB_CLIENT_ID,
            client_secret: env.SKETCHFAB_CLIENT_SECRET,
            redirect_uri: redirectUri(req, env),
            code,
          }).toString(),
        },
        fetcher,
      );
      if (
        typeof token.access_token !== "string" ||
        token.access_token.length > 4096 ||
        String(token.token_type).toLowerCase() !== "bearer" ||
        !Number.isFinite(token.expires_in) ||
        token.expires_in <= 0
      )
        return bounce("invalid-token");
      await env.DB.prepare(
        "INSERT INTO sketchfab_connection(id,encrypted_token,expires_at,connected_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET encrypted_token=excluded.encrypted_token,expires_at=excluded.expires_at,connected_at=excluded.connected_at",
      )
        .bind(
          await encryptToken(token.access_token, env),
          Date.now() + Math.min(token.expires_in, 2592000) * 1000,
          Date.now(),
        )
        .run();
      return bounce("connected");
    }
    if (action === "search" && req.method === "GET") {
      const query = searchParameters(url.searchParams);
      const [data, licenses] = await Promise.all([
        upstream(API + "/search?" + query, {}, fetcher),
        upstream(API + "/licenses", {}, fetcher),
      ]);
      return json({
        results: (data.results || []).map((model) =>
          modelSummary(model, licenses.results || []),
        ),
        nextOffset: data.next ? Number(query.get("offset")) + 12 : null,
      });
    }
    if (action === "status" && req.method === "GET") {
      const connection = await env.DB.prepare(
        "SELECT expires_at FROM sketchfab_connection WHERE id=1",
      ).first();
      return json({
        configured: ready(env),
        connected:
          ready(env) && !!connection && connection.expires_at > Date.now(),
        expiresAt: connection?.expires_at || null,
      });
    }
    if (action === "connect" && req.method === "POST") {
      if (!ready(env))
        return json(
          {
            error:
              "Configure Sketchfab client ID, client secret, callback URL and private token encryption key first.",
          },
          503,
        );
      const callback = redirectUri(req, env),
        state = random(),
        nonce = random();
      await env.DB.batch([
        env.DB.prepare(
          "DELETE FROM sketchfab_oauth_states WHERE expires_at<=?",
        ).bind(Date.now()),
        env.DB.prepare(
          "INSERT INTO sketchfab_oauth_states VALUES(?,?,?,?)",
        ).bind(
          await hash(state + ":" + env.ADMIN_PASSWORD),
          await hash(nonce),
          sessionHash,
          Date.now() + 600000,
        ),
      ]);
      const query = new URLSearchParams({
        response_type: "code",
        client_id: env.SKETCHFAB_CLIENT_ID,
        redirect_uri: callback,
        state,
      });
      const response = json({ url: OAUTH + "/authorize/?" + query });
      response.headers.set(
        "Set-Cookie",
        `${COOKIE}=${nonce}; Path=/api/sketchfab/callback; Secure; HttpOnly; SameSite=Lax; Max-Age=600`,
      );
      return response;
    }
    if (action === "disconnect" && req.method === "POST") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sketchfab_connection"),
        env.DB.prepare("DELETE FROM sketchfab_oauth_states"),
      ]);
      return json({ connected: false });
    }
    if (action === "download" && req.method === "POST") {
      if (!ready(env))
        return json({ error: "Connect Sketchfab before downloading." }, 503);
      const body = await req.text();
      if (body.length > 4096)
        return json({ error: "Invalid download request." }, 400);
      const input = JSON.parse(body);
      uid(input.uid);
      if (input.acknowledgeLicense !== true)
        return json(
          { error: "Review and acknowledge the model license first." },
          400,
        );
      const connection = await env.DB.prepare(
        "SELECT encrypted_token,expires_at FROM sketchfab_connection WHERE id=1",
      ).first();
      if (!connection || connection.expires_at <= Date.now())
        return json(
          {
            error:
              "Sketchfab authorization expired or is missing. Connect again.",
          },
          401,
        );
      const token = await decryptToken(connection.encrypted_token, env),
        headers = { Authorization: "Bearer " + token };
      const [details, licenses] = await Promise.all([
        upstream(API + "/models/" + input.uid, {}, fetcher),
        upstream(API + "/licenses", {}, fetcher),
      ]);
      const model = modelSummary(details, licenses.results || []);
      if (!model.commercialImportAllowed)
        return json(
          {
            error:
              "This model is restricted, not downloadable, or its license is unsuitable for this commercial store.",
          },
          403,
        );
      const result = await upstream(
          API + "/models/" + input.uid + "/download",
          { headers },
          fetcher,
        ),
        archive = result.glb || result.gltf;
      if (!archive?.url)
        return json(
          {
            error:
              "Sketchfab did not offer a GLB/glTF download for this model.",
          },
          409,
        );
      const target = new URL(archive.url);
      if (
        target.protocol !== "https:" ||
        target.username ||
        target.password ||
        !(
          target.hostname.endsWith(".sketchfab.com") ||
          target.hostname.endsWith(".amazonaws.com") ||
          target.hostname.endsWith(".cloudfront.net")
        )
      )
        return json(
          {
            error:
              "Unsupported official download host; no archive was fetched.",
          },
          502,
        );
      return json({
        archiveUrl: target.href,
        expires: archive.expires || null,
        metadata: {
          ...model,
          attribution: creditText(model),
          downloadAuthorization: "official-download-api",
          retrievedAt: new Date().toISOString(),
        },
      });
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (url.pathname === "/api/sketchfab/callback")
      return bounce("connection-failed");
    return json(
      {
        error: error.message?.startsWith("Sketchfab")
          ? error.message
          : "Invalid Sketchfab request or missing integration migration. Check setup.",
      },
      error.status || 400,
    );
  }
}
