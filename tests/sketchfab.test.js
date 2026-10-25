import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { readFile, mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { handleSketchfab } from "../server/sketchfab.js";
import { searchParameters, modelSummary } from "../src/lib/sketchfab.js";
import { inspectGltf, resourcePath } from "../src/lib/gltf-import.js";
import { importSketchfab } from "../scripts/import-sketchfab.mjs";
let mf, db;
const origin = "https://cms.test",
  id = "a".repeat(32),
  sessionHash = "b".repeat(64);
const env = {
  ADMIN_PASSWORD: "test-password",
  SKETCHFAB_CLIENT_ID: "fixture-client",
  SKETCHFAB_CLIENT_SECRET: "fixture-secret",
  SKETCHFAB_REDIRECT_URI: origin + "/api/sketchfab/callback",
  SKETCHFAB_TOKEN_KEY: randomBytes(32).toString("hex"),
};
export const fixtureModel = {
  uid: id,
  name: "Supermarket shelf",
  isDownloadable: true,
  user: {
    displayName: "Fixture creator",
    username: "fixture-creator",
    profileUrl: "https://sketchfab.com/fixture-creator",
  },
  license: {
    slug: "by",
    label: "CC Attribution",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
};
const request = (path, options = {}) => new Request(origin + path, options);
const digest = (value) => createHash("sha256").update(value).digest("hex");
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    d1Databases: ["DB"],
  });
  db = await mf.getD1Database("DB");
  env.DB = db;
  for (const file of [
    "migrations/0001_cms.sql",
    "migrations/0003_sketchfab.sql",
  ])
    await db.exec((await readFile(file, "utf8")).replace(/\n/g, " "));
  await db
    .prepare("INSERT INTO admin_sessions VALUES(?,?)")
    .bind(sessionHash, Date.now() + 600000)
    .run();
});
after(async () => mf?.dispose());
test("official search requests supermarket shelf with keyword, license and availability filters", async () => {
  let called;
  const response = await handleSketchfab(
    request(
      "/api/admin/sketchfab/search?q=supermarket%20shelf&license=by&downloadable=true",
    ),
    env,
    {},
    async (url) => {
      if (url.endsWith("/licenses")) return Response.json({ results: [] });
      called = new URL(url);
      return Response.json({ results: [fixtureModel], next: null });
    },
  );
  assert.equal(called.origin, "https://api.sketchfab.com");
  assert.equal(called.pathname, "/v3/search");
  assert.equal(called.searchParams.get("q"), "supermarket shelf");
  assert.equal(called.searchParams.get("license"), "by");
  assert.equal(called.searchParams.get("downloadable"), "true");
  const data = await response.json();
  assert.equal(data.results[0].creator.name, "Fixture creator");
  assert.equal(data.results[0].commercialImportAllowed, true);
  assert.throws(() =>
    searchParameters(new URLSearchParams("q=shelf&license=made-up")),
  );
  assert.throws(() =>
    searchParameters(new URLSearchParams("q=shelf&offset=https://evil.test")),
  );
  assert.equal(
    modelSummary({ ...fixtureModel, isDownloadable: false })
      .commercialImportAllowed,
    false,
  );
  assert.equal(
    modelSummary({
      ...fixtureModel,
      license: { slug: "by-nc", url: fixtureModel.license.url },
    }).commercialImportAllowed,
    false,
  );
});
let callbackUrl, nonceCookie;
test("OAuth uses a one-use state bound to a private callback cookie and the admin session", async () => {
  const response = await handleSketchfab(
    request("/api/admin/sketchfab/connect", { method: "POST" }),
    env,
    { sessionHash },
  );
  const data = await response.json(),
    url = new URL(data.url);
  assert.equal(url.origin, "https://sketchfab.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.match(
    response.headers.get("Set-Cookie"),
    /Secure; HttpOnly; SameSite=Lax/,
  );
  nonceCookie = response.headers.get("Set-Cookie").split(";")[0];
  callbackUrl =
    "/api/sketchfab/callback?code=fixture-code&state=" +
    url.searchParams.get("state");
  const stored = await db
    .prepare("SELECT * FROM sketchfab_oauth_states")
    .first();
  assert.equal(
    stored.state_hash,
    digest(url.searchParams.get("state") + ":" + env.ADMIN_PASSWORD),
  );
  assert.equal(stored.session_hash, sessionHash);
  let calls = 0;
  const bad = await handleSketchfab(request(callbackUrl), env, {}, () => {
    calls++;
  });
  assert.equal(bad.headers.get("Location"), "/?sketchfab=invalid-state");
  assert.equal(calls, 0);
});
test("OAuth exchanges on the server, encrypts the token, rejects replay and exposes no credentials", async () => {
  let exchanged;
  const response = await handleSketchfab(
    request(callbackUrl, { headers: { Cookie: nonceCookie } }),
    env,
    {},
    async (url, options) => {
      exchanged = { url, form: new URLSearchParams(options.body) };
      return Response.json({
        access_token: "fixture-access-token",
        token_type: "bearer",
        expires_in: 3600,
      });
    },
  );
  assert.equal(exchanged.url, "https://sketchfab.com/oauth2/token/");
  assert.equal(
    exchanged.form.get("client_secret"),
    env.SKETCHFAB_CLIENT_SECRET,
  );
  assert.equal(response.headers.get("Location"), "/?sketchfab=connected");
  assert.equal(await response.text(), "");
  const row = await db.prepare("SELECT * FROM sketchfab_connection").first();
  assert.ok(!row.encrypted_token.includes("fixture-access-token"));
  const status = await handleSketchfab(
    request("/api/admin/sketchfab/status"),
    env,
  );
  assert.deepEqual(Object.keys(await status.json()).sort(), [
    "configured",
    "connected",
    "expiresAt",
  ]);
  const replay = await handleSketchfab(
    request(callbackUrl, { headers: { Cookie: nonceCookie } }),
    env,
    {},
    () => assert.fail("must not exchange twice"),
  );
  assert.equal(replay.headers.get("Location"), "/?sketchfab=expired-state");
});
test("restricted and noncommercial models never reach the Download API", async () => {
  for (const model of [
    { ...fixtureModel, isDownloadable: false },
    {
      ...fixtureModel,
      license: { slug: "by-nc", url: fixtureModel.license.url },
    },
  ]) {
    let calls = 0;
    const response = await handleSketchfab(
      request("/api/admin/sketchfab/download", {
        method: "POST",
        body: JSON.stringify({ uid: id, acknowledgeLicense: true }),
      }),
      env,
      {},
      async (url) => {
        if (url.endsWith("/licenses")) return Response.json({ results: [] });
        calls++;
        assert.ok(!url.endsWith("/download"));
        return Response.json(model);
      },
    );
    assert.equal(response.status, 403);
    assert.equal(calls, 1);
  }
});
test("authorized download uses bearer auth only on official API and preserves creator/license metadata", async () => {
  const calls = [];
  const response = await handleSketchfab(
    request("/api/admin/sketchfab/download", {
      method: "POST",
      body: JSON.stringify({ uid: id, acknowledgeLicense: true }),
    }),
    env,
    {},
    async (url, options) => {
      if (url.endsWith("/licenses")) return Response.json({ results: [] });
      calls.push({ url, options });
      return Response.json(
        url.endsWith("/download")
          ? {
              gltf: {
                url: "https://media.sketchfab.com/fixture.zip",
                expires: 300,
              },
            }
          : fixtureModel,
      );
    },
  );
  assert.equal(response.status, 200);
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer fixture-access-token",
  );
  const data = await response.json();
  assert.equal(data.metadata.downloadAuthorization, "official-download-api");
  assert.match(data.metadata.attribution, /Fixture creator/);
  assert.ok(!JSON.stringify(data).includes("fixture-access-token"));
  const denied = await handleSketchfab(
    request("/api/admin/sketchfab/download", {
      method: "POST",
      body: JSON.stringify({ uid: id }),
    }),
    env,
    {},
    () => assert.fail("license acknowledgement required"),
  );
  assert.equal(denied.status, 400);
  const expired = await handleSketchfab(
    request("/api/admin/sketchfab/download", {
      method: "POST",
      body: JSON.stringify({ uid: id, acknowledgeLicense: true }),
    }),
    { ...env, SKETCHFAB_TOKEN_KEY: "0".repeat(64) },
    {},
    () => assert.fail("bad encryption key must fail closed"),
  );
  assert.equal(expired.status, 400);
});
test("local glTF inspection rejects remote resources, traversal and oversized geometry", () => {
  for (const path of [
    "https://evil.test/a.bin",
    "../secret.bin",
    "%2e%2e/private",
    "/etc/passwd",
    "a\\b",
  ])
    assert.throws(() => resourcePath(path));
  const bytes = (data) => new TextEncoder().encode(JSON.stringify(data)).buffer;
  assert.throws(() =>
    inspectGltf(
      bytes({
        asset: { version: "2.0" },
        buffers: [{ uri: "https://evil.test/a.bin" }],
      }),
      "scene.gltf",
    ),
  );
  assert.throws(() =>
    inspectGltf(
      bytes({
        asset: { version: "2.0" },
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        accessors: [{ count: 500001 }],
      }),
      "scene.gltf",
    ),
  );
  assert.deepEqual(
    inspectGltf(
      bytes({ asset: { version: "2.0" }, buffers: [{ uri: "buffer.bin" }] }),
      "scene.gltf",
    ).resources,
    ["buffer.bin"],
  );
});
test("repository import preserves credits and rejects external glTF references and duplicate imports", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "lunova-import-test-"));
  try {
    const source = join(scratch, "input");
    await mkdir(source);
    const model = join(source, "scene.gltf"),
      metadata = join(scratch, "credits.json"),
      output = join(scratch, "output");
    await writeFile(model, JSON.stringify({ asset: { version: "2.0" } }));
    await writeFile(
      metadata,
      JSON.stringify({
        ...modelSummary(fixtureModel),
        downloadAuthorization: "official-download-api",
      }),
    );
    const record = await importSketchfab(source, metadata, output);
    assert.match(record.asset, /scene.gltf/);
    assert.match(
      await readFile(join(output, id, "credits.txt"), "utf8"),
      /creativecommons.org/,
    );
    assert.equal(
      JSON.parse(await readFile(join(output, "index.json"), "utf8")).length,
      1,
    );
    await assert.rejects(importSketchfab(source, metadata, output));
    await writeFile(
      model,
      JSON.stringify({
        asset: { version: "2.0" },
        images: [{ uri: "https://evil.test/texture.png" }],
      }),
    );
    await assert.rejects(
      importSketchfab(source, metadata, join(scratch, "other")),
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("short license references from real search responses resolve against the official catalog", () => {
  const reference = {
    ...fixtureModel,
    license: {
      uid: "322a749bcfa841b29dff1e8a1bb74b0b",
      label: "CC Attribution",
    },
  };
  const result = modelSummary(reference, [
    {
      uri: "https://api.sketchfab.com/v3/licenses/322a749bcfa841b29dff1e8a1bb74b0b",
      slug: "by",
      label: "CC Attribution",
      url: "http://creativecommons.org/licenses/by/4.0/",
    },
  ]);
  assert.equal(
    result.license.url,
    "https://creativecommons.org/licenses/by/4.0/",
  );
  assert.equal(result.commercialImportAllowed, true);
  assert.equal(
    modelSummary(reference).commercialImportAllowed,
    false,
    "unknown licenses fail closed",
  );
});
test("expired state, revoked sessions and password rotation invalidate pending OAuth callbacks", async () => {
  for (const mode of ["expired", "rotated", "revoked"]) {
    const started = await handleSketchfab(
      request("/api/admin/sketchfab/connect", { method: "POST" }),
      env,
      { sessionHash },
    );
    const state = new URL((await started.json()).url).searchParams.get("state"),
      cookie = started.headers.get("Set-Cookie").split(";")[0];
    if (mode === "expired")
      await db.prepare("UPDATE sketchfab_oauth_states SET expires_at=0").run();
    if (mode === "revoked")
      await db
        .prepare("DELETE FROM admin_sessions WHERE token_hash=?")
        .bind(sessionHash)
        .run();
    const result = await handleSketchfab(
      request("/api/sketchfab/callback?state=" + state + "&code=unused", {
        headers: { Cookie: cookie },
      }),
      mode === "rotated" ? { ...env, ADMIN_PASSWORD: "changed" } : env,
      {},
      () => assert.fail("expired state must never exchange code"),
    );
    assert.equal(result.headers.get("Location"), "/?sketchfab=expired-state");
  }
});
test("malicious ZIP members are rejected without writing outside the import directory", async () => {
  const { execFileSync } = await import("node:child_process");
  const scratch = await mkdtemp(join(tmpdir(), "lunova-zip-test-"));
  try {
    const archive = join(scratch, "unsafe.zip");
    execFileSync("python3", [
      "-c",
      'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("../escape.gltf","{}"); z.close()',
      archive,
    ]);
    const metadata = join(scratch, "credits.json");
    await writeFile(
      metadata,
      JSON.stringify({
        ...modelSummary(fixtureModel),
        downloadAuthorization: "official-download-api",
      }),
    );
    await assert.rejects(
      importSketchfab(archive, metadata, join(scratch, "out")),
    );
    await assert.rejects(readFile(join(scratch, "escape.gltf")));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
