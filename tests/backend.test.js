import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, rm } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { randomBytes } from "node:crypto";
import { defaultCatalog } from "../src/lib/products.js";
import { defaultSettings } from "../src/lib/shop.js";
let mf, db;
const password = randomBytes(24).toString("hex"),
  origin = "https://cms.test",
  username = "test-admin";
const request = (path, options = {}) =>
  mf.dispatchFetch(origin + path, {
    ...options,
    headers: {
      Origin: origin,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
before(async () => {
  const bundle = await build({
    entryPoints: ["server/worker.js"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
  });
  mf = new Miniflare({
    modules: true,
    script: bundle.outputFiles[0].text,
    d1Databases: ["DB"],
    bindings: { ADMIN_USERNAME: username, ADMIN_PASSWORD: password },
  });
  db = await mf.getD1Database("DB");
  const schema = await readFile("migrations/0001_cms.sql", "utf8");
  await db.exec(schema.replace(/\n/g, " "));
});
after(async () => {
  await mf?.dispose();
});
let cookie;
test("public reads work but writes and admin reads require a server session", async () => {
  const publicResponse = await request("/api/store");
  assert.equal(publicResponse.status, 200);
  const data = await publicResponse.json();
  assert.equal(data.catalog.products.length, 21);
  assert.equal(data.revision, 0);
  assert.equal((await request("/api/admin/store")).status, 401);
  assert.equal(
    (
      await request("/api/admin/store", {
        method: "PUT",
        body: JSON.stringify({
          catalog: defaultCatalog,
          settings: defaultSettings,
          revision: 0,
        }),
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/api/admin/signup", { method: "POST" })).status,
    404,
  );
});
test("invalid credentials and cross-site logins fail without issuing a session", async () => {
  const invalid = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password: "incorrect" }),
  });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.headers.get("set-cookie"), null);
  assert.equal(
    (
      await request("/api/admin/login", {
        method: "POST",
        headers: { Origin: "https://attacker.test" },
        body: JSON.stringify({ username, password }),
      })
    ).status,
    403,
  );
});
test("valid login issues a protected cookie and only its hash is stored", async () => {
  const response = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  const value = response.headers.get("set-cookie");
  assert.match(value, /HttpOnly/);
  assert.match(value, /Secure/);
  assert.match(value, /SameSite=Strict/);
  cookie = value.split(";")[0];
  assert.equal(
    (await request("/api/admin/store", { headers: { Cookie: cookie } })).status,
    200,
  );
  const row = await db
    .prepare("SELECT token_hash FROM admin_sessions LIMIT 1")
    .first();
  assert.ok(row.token_hash);
  assert.ok(!cookie.includes(row.token_hash));
  assert.equal(
    (
      await request("/api/admin/store", {
        headers: { Cookie: "__Host-lunova_admin=forged" },
      })
    ).status,
    401,
  );
});
test("authorized changes are shared, validated and protected from stale writes and CSRF", async () => {
  const settings = { ...defaultSettings, type: "bakery", name: "Test bakery" };
  const body = JSON.stringify({
    catalog: defaultCatalog,
    settings,
    revision: 0,
  });
  const saved = await request("/api/admin/store", {
    method: "PUT",
    headers: { Cookie: cookie },
    body,
  });
  assert.equal(saved.status, 200);
  const publicData = await (await request("/api/store")).json();
  assert.equal(publicData.settings.type, "bakery");
  assert.equal(publicData.settings.name, "Test bakery");
  assert.equal(publicData.revision, 1);
  assert.equal(
    (
      await request("/api/admin/store", {
        method: "PUT",
        headers: { Cookie: cookie },
        body,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/api/admin/store", {
        method: "PUT",
        headers: { Cookie: cookie, Origin: "https://attacker.test" },
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/store", {
        method: "PUT",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          catalog: defaultCatalog,
          settings: { ...settings, type: "invalid" },
          revision: 1,
        }),
      })
    ).status,
    400,
  );
});
test("logout and expiration invalidate the session", async () => {
  const logout = await request("/api/admin/logout", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(
    (await request("/api/admin/store", { headers: { Cookie: cookie } })).status,
    401,
  );
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const expired = login.headers.get("set-cookie").split(";")[0];
  await db.prepare("UPDATE admin_sessions SET expires_at = 0").run();
  assert.equal(
    (await request("/api/admin/store", { headers: { Cookie: expired } }))
      .status,
    401,
  );
});
test("repeated login failures are rate limited", async () => {
  for (let i = 0; i < 6; i++) {
    const response = await request("/api/admin/login", {
      method: "POST",
      headers: { "CF-Connecting-IP": "192.0.2.17" },
      body: JSON.stringify({ username, password: "wrong" }),
    });
    assert.equal(response.status, 401);
  }
  assert.equal(
    (
      await request("/api/admin/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "192.0.2.17" },
        body: JSON.stringify({ username, password }),
      })
    ).status,
    429,
  );
});
test("missing production credentials fail closed", async () => {
  const { handleApi } = await import("../server/handler.js");
  const response = await handleApi(
    new Request(origin + "/api/admin/login", {
      method: "POST",
      headers: { Origin: origin },
      body: JSON.stringify({ username, password }),
    }),
    {},
  );
  assert.equal(response.status, 503);
});
test("login rejects malformed bodies and password rotation revokes existing sessions", async () => {
  assert.equal(
    (await request("/api/admin/login", { method: "POST", body: "null" }))
      .status,
    400,
  );
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const current = login.headers.get("set-cookie").split(";")[0];
  const { handleApi } = await import("../server/handler.js");
  const response = await handleApi(
    new Request(origin + "/api/admin/store", { headers: { Cookie: current } }),
    { DB: db, ADMIN_PASSWORD: password + "-rotated", ADMIN_USERNAME: username },
  );
  assert.equal(response.status, 401);
});
