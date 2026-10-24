import test from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import {
  convertPhoto,
  providerInfo,
  providerOrigin,
  sseResult,
  validateGlb,
  generateStored,
  modelResponse,
  ensureModels,
} from "../server/models.js";
import { fixtureGlb } from "./helpers/glb.js";
import { validateCatalog } from "../src/lib/catalog.js";
import { defaultCatalog } from "../src/lib/products.js";
const image = "data:image/jpeg;base64," + btoa("fixture-photo");
function fakeProvider({ quota = false, foreign = false } = {}) {
  const calls = [];
  const bytes = fixtureGlb();
  const fetcher = async (url, options = {}) => {
    url = String(url);
    calls.push({ url, options });
    if (url.endsWith("/info"))
      return Response.json({
        named_endpoints: { "/generate": {}, "/preprocess": {} },
      });
    if (url.endsWith("/upload")) {
      assert.ok(options.body instanceof FormData);
      return Response.json(["/tmp/product.jpeg"]);
    }
    if (options.method === "POST")
      return Response.json({ event_id: "job-123" });
    if (url.includes("/call/preprocess/"))
      return new Response(
        'event: complete\ndata: [{"path":"/tmp/processed.png","meta":{"_type":"gradio.FileData"}}]\n\n',
      );
    if (url.includes("/call/generate/"))
      return new Response(
        quota
          ? 'event: error\ndata: "GPU quota exceeded"\n\n'
          : `event: heartbeat\ndata: null\n\nevent: complete\ndata: [{"path":"/tmp/model.obj"},{"path":"/tmp/model.glb"${foreign ? ',"url":"https://other.test/model.glb"' : ""}}]\n\n`,
      );
    if (url.includes("/file=")) return new Response(bytes);
    throw Error("Unexpected provider call");
  };
  return { calls, fetcher, bytes };
}
test("hosted transport uploads, preprocesses and downloads GLB without exposing token or contacting a paid API", async () => {
  const { fetcher, calls, bytes } = fakeProvider();
  assert.deepEqual(
    await convertPhoto(image, { HF_TOKEN: "fixture-server-token" }, fetcher),
    bytes,
  );
  assert.equal(calls.length, 7);
  assert.ok(
    calls.every(
      (c) => new URL(c.url).hostname === "stabilityai-triposr.hf.space",
    ),
  );
  assert.ok(
    calls.every(
      (c) => c.options.headers.Authorization === "Bearer fixture-server-token",
    ),
  );
  const generation = calls.find((c) => c.url.endsWith("/call/generate"));
  assert.equal(JSON.parse(generation.options.body).data[1], 128);
});
test("quota failures stop before downloading, and cross-origin model downloads are rejected", async () => {
  const quota = fakeProvider({ quota: true });
  await assert.rejects(convertPhoto(image, {}, quota.fetcher), /quota/i);
  assert.ok(!quota.calls.some((c) => c.url.includes("/file=")));
  const foreign = fakeProvider({ foreign: true });
  await assert.rejects(
    convertPhoto(image, {}, foreign.fetcher),
    /configured service/i,
  );
  assert.ok(!foreign.calls.some((c) => c.url.startsWith("https://other.test")));
});
test("unsupported service, unsafe provider, invalid photo and invalid GLB fail clearly", async () => {
  for (const url of [
    "http://localhost/",
    "https://private.test/",
    "https://user:pass@demo.hf.space/",
    "https://demo.hf.space/path",
  ])
    assert.throws(() => providerOrigin({ HF_SPACE_URL: url }));
  await assert.rejects(
    convertPhoto("https://private.test/image", {}, () => {
      throw Error("Must not fetch");
    }),
    /photo/i,
  );
  await assert.rejects(
    providerInfo({}, async () => Response.json({ named_endpoints: {} })),
    /compatible Space/,
  );
  assert.throws(() => validateGlb(new Uint8Array(30)), /invalid GLB/);
  assert.throws(
    () =>
      validateGlb(
        fixtureGlb({
          buffers: [{ uri: "https://private.test", byteLength: 36 }],
        }),
      ),
    /self-contained/,
  );
  assert.throws(
    () =>
      validateGlb(
        fixtureGlb({ extensionsRequired: ["KHR_draco_mesh_compression"] }),
      ),
    /uncompressed/,
  );
  assert.throws(
    () => validateGlb(fixtureGlb({ accessors: [{ count: 300001 }] })),
    /too detailed/,
  );
});
test("SSE parser handles chunk boundaries, heartbeat and quota errors", async () => {
  const encoder = new TextEncoder();
  const text =
    'event: heartbeat\r\ndata: null\r\n\r\nevent: complete\r\ndata: ["ok"]\r\n\r\n';
  let i = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (i === text.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(text[i++]));
    },
  });
  assert.deepEqual(await sseResult(new Response(stream)), ["ok"]);
  await assert.rejects(
    sseResult(new Response('event: error\ndata: "quota exhausted"\n\n')),
    /quota/,
  );
});
test("D1 stores durable chunks, serves them, caches repeat photos and prevents concurrent generation", async () => {
  const mf = new Miniflare({
    modules: true,
    script: "export default {fetch(){return new Response('ok')}}",
    d1Databases: ["DB"],
  });
  try {
    const db = await mf.getD1Database("DB"),
      provider = fakeProvider();
    const env = { DB: db };
    const result = await generateStored(image, env, provider.fetcher);
    assert.match(result.modelUrl, /^\/api\/models\/[a-f0-9]{64}\.glb$/);
    const id = result.modelUrl.split("/").at(-1).slice(0, -4);
    const response = await modelResponse(
      new Request("https://store.test" + result.modelUrl),
      env,
      id,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      provider.bytes,
    );
    assert.match(response.headers.get("Cache-Control"), /immutable/);
    const cached = await generateStored(image, env, () => {
      throw Error("Duplicate must not call provider");
    });
    assert.equal(cached.cached, true);
    const conditional = await modelResponse(
      new Request("https://store.test" + result.modelUrl, {
        headers: { "If-None-Match": `"${id}"` },
      }),
      env,
      id,
    );
    assert.equal(conditional.status, 304);
    await ensureModels(db);
    await db
      .prepare("INSERT INTO model_generation_lock VALUES (1,'other',?)")
      .bind(Date.now() + 10000)
      .run();
    await assert.rejects(
      generateStored(image + "AA", env, provider.fetcher),
      /Another model/,
    );
  } finally {
    await mf.dispose();
  }
});
test("catalog retains only local model assets and hashes, preserving legacy catalogs", () => {
  const product = defaultCatalog.products[0];
  const url = "/api/models/" + "a".repeat(64) + ".glb";
  const updated = validateCatalog({
    ...defaultCatalog,
    products: [
      {
        ...product,
        modelUrl: url,
        modelImageHash: "b".repeat(64),
        autoModel: true,
      },
    ],
  });
  assert.equal(updated.products[0].modelUrl, url);
  assert.equal(updated.products[0].autoModel, true);
  const unsafe = validateCatalog({
    ...defaultCatalog,
    products: [{ ...product, modelUrl: "https://other.test/model.glb" }],
  });
  assert.equal(unsafe.products[0].modelUrl, undefined);
  assert.deepEqual(validateCatalog(defaultCatalog), defaultCatalog);
});

test("legacy Gradio HTTP queue is supported without retrying an accepted inference", async () => {
  const modern = fakeProvider();
  let joins = 0;
  const fetcher = async (url, options = {}) => {
    url = String(url);
    if (url.includes("/call/"))
      return new Response("Not found", { status: 404 });
    if (url.endsWith("/config"))
      return Response.json({
        protocol: "sse",
        dependencies: [{ api_name: "preprocess" }, { api_name: "generate" }],
      });
    if (url.endsWith("/queue/join")) {
      joins++;
      return Response.json({ event_id: "legacy-job" });
    }
    if (url.includes("/queue/data"))
      return new Response(
        "data: " +
          JSON.stringify({
            msg: "process_completed",
            success: true,
            output: {
              data:
                joins === 1
                  ? [{ path: "/tmp/processed.png" }]
                  : [{ path: "/tmp/model.obj" }, { path: "/tmp/model.glb" }],
            },
          }) +
          "\n\n",
      );
    return modern.fetcher(url, options);
  };
  assert.deepEqual(await convertPhoto(image, {}, fetcher), modern.bytes);
  assert.equal(joins, 2);
});
