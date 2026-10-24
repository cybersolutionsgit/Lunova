// Hugging Face Gradio transport. No billing provider or paid fallback is used.
export const MAX_MODEL_BYTES = 4 * 1024 * 1024;
const MAX_STORAGE = 64 * 1024 * 1024;
const CHUNK = 192 * 1024;
export class ModelError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}
export function providerOrigin(env) {
  const value = env.HF_SPACE_URL || "https://stabilityai-triposr.hf.space";
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.hf\.space$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new ModelError(
      "HF_SPACE_URL must be the HTTPS address of a Hugging Face Space.",
      503,
    );
  return url.origin;
}
function auth(env) {
  return env.HF_TOKEN ? { Authorization: `Bearer ${env.HF_TOKEN}` } : {};
}
async function limited(response, max) {
  if (!response.ok) {
    if (response.status === 429)
      throw new ModelError(
        "The free GPU quota or queue limit was reached. Try later; no paid fallback is used.",
        429,
      );
    if ([401, 403].includes(response.status))
      throw new ModelError(
        "The hosted service requires access. Add your Hugging Face token as the server-only HF_TOKEN secret, or check Space access.",
        503,
      );
    throw new ModelError(
      "The free 3D service is unavailable or its API changed. Your photo stays available.",
    );
  }
  if (Number(response.headers.get("Content-Length")) > max)
    throw new ModelError("The generated file is too large for this store.");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new ModelError("The generated file exceeds the store size limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function request(url, env, options = {}, fetcher = fetch) {
  return fetcher(url, {
    ...options,
    redirect: "error",
    headers: { ...auth(env), ...options.headers },
    signal: options.signal || AbortSignal.timeout(20000),
  });
}
export async function providerInfo(env, fetcher = fetch) {
  const origin = providerOrigin(env);
  for (const base of ["/gradio_api", ""]) {
    const response = await request(origin + base + "/info", env, {}, fetcher);
    if (response.status === 404) continue;
    const info = JSON.parse(
      new TextDecoder().decode(await limited(response, 500000)),
    );
    const endpoints = info.named_endpoints;
    if (!endpoints?.["/generate"] || !endpoints?.["/preprocess"])
      throw new ModelError(
        "This Space does not expose the TripoSR preprocess/generate API. Choose a compatible Space; no conversion was started.",
        503,
      );
    return { origin, base };
  }
  throw new ModelError(
    "The hosted Space does not expose a supported Gradio API.",
    503,
  );
}
export async function sseResult(response) {
  if (!response.ok) await limited(response, 500000);
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 1000000)
        throw new ModelError("The 3D service returned too much progress data.");
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(
        /\r\n/g,
        "\n",
      );
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const data = block
          .split("\n")
          .filter((x) => x.startsWith("data:"))
          .map((x) => x.slice(5).trimStart())
          .join("\n");
        if (event === "error") {
          if (/quota|limit|exceed/i.test(data))
            throw new ModelError(
              "The free GPU quota is exhausted. Try after it resets; no paid fallback is used.",
              429,
            );
          throw new ModelError(
            "The hosted AI could not generate this image. Try a clear, centred product photo.",
          );
        }
        if (event === "complete") return JSON.parse(data);
        if (!event && data) {
          const message = JSON.parse(data);
          if (message.msg === "process_completed") {
            if (message.success === false) {
              if (/quota|limit|exceed/i.test(JSON.stringify(message.output)))
                throw new ModelError(
                  "The free GPU quota is exhausted. Try after it resets; no paid fallback is used.",
                  429,
                );
              throw new ModelError(
                "The hosted AI could not process this photo.",
              );
            }
            return message.output?.data;
          }
          if (
            ["queue_full", "unexpected_error", "server_stopped"].includes(
              message.msg,
            )
          )
            throw new ModelError(
              "The free GPU queue is unavailable. Try later.",
              503,
            );
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  throw new ModelError(
    "The 3D service disconnected before returning a model. Try later.",
  );
}
async function call(api, data, provider, env, signal, fetcher) {
  const url = provider.origin + provider.base + "/call/" + api;
  const response = await request(
    url,
    env,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal,
    },
    fetcher,
  );
  if (response.status === 404) {
    // Older Gradio 4 Spaces use an HTTP/SSE queue instead of /call.
    const config = await request(
      provider.origin + "/config",
      env,
      { signal },
      fetcher,
    );
    const configuration = JSON.parse(
      new TextDecoder().decode(await limited(config, 500000)),
    );
    const dependencies = configuration.dependencies || [];
    const index = dependencies.findIndex((row) => row.api_name === api);
    if (index < 0 || /ws|websocket/i.test(configuration.protocol || ""))
      throw new ModelError(
        "This Space's legacy API is not supported. Choose a TripoSR Space with an HTTP/SSE API.",
        503,
      );
    const session = crypto.randomUUID().replaceAll("-", "");
    const joined = await request(
      provider.origin + provider.base + "/queue/join",
      env,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          fn_index: dependencies[index].id ?? index,
          session_hash: session,
          event_data: null,
        }),
        signal,
      },
      fetcher,
    );
    const accepted = JSON.parse(
      new TextDecoder().decode(await limited(joined, 100000)),
    );
    if (!accepted.event_id)
      throw new ModelError("The service did not accept the conversion job.");
    return sseResult(
      await request(
        provider.origin + provider.base + "/queue/data?session_hash=" + session,
        env,
        { signal },
        fetcher,
      ),
    );
  }
  const started = JSON.parse(
    new TextDecoder().decode(await limited(response, 100000)),
  );
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(started.event_id || ""))
    throw new ModelError("The service did not accept the conversion job.");
  return sseResult(
    await request(url + "/" + started.event_id, env, { signal }, fetcher),
  );
}
export async function convertPhoto(image, env, fetcher = fetch) {
  const match =
    typeof image === "string" &&
    image.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match || image.length > 900000)
    throw new ModelError(
      "Use a resized JPG, PNG or WebP photo under 650 KB.",
      400,
    );
  const provider = await providerInfo(env, fetcher),
    signal = AbortSignal.timeout(150000);
  const data = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append(
    "files",
    new Blob([data], { type: "image/" + match[1] }),
    "product." + match[1],
  );
  const uploaded = JSON.parse(
    new TextDecoder().decode(
      await limited(
        await request(
          provider.origin + provider.base + "/upload",
          env,
          { method: "POST", body: form, signal },
          fetcher,
        ),
        100000,
      ),
    ),
  );
  if (!Array.isArray(uploaded) || typeof uploaded[0] !== "string")
    throw new ModelError("The service could not accept the product photo.");
  const file = {
    path: uploaded[0],
    orig_name: "product." + match[1],
    meta: { _type: "gradio.FileData" },
  };
  const processed = await call(
    "preprocess",
    [file, true, 0.85],
    provider,
    env,
    signal,
    fetcher,
  );
  if (!processed?.[0]?.path)
    throw new ModelError("The service did not return a processed photo.");
  const result = await call(
    "generate",
    [processed[0], 128],
    provider,
    env,
    signal,
    fetcher,
  );
  const model = result?.find(
    (x) => typeof x?.path === "string" && /\.glb$/i.test(x.path),
  );
  if (!model) throw new ModelError("The service did not return a GLB model.");
  const url = model.url
    ? new URL(model.url, provider.origin)
    : new URL(
        provider.base + "/file=" + encodeURI(model.path),
        provider.origin,
      );
  if (url.origin !== provider.origin || url.username || url.password)
    throw new ModelError(
      "The model download was not on the configured service.",
    );
  const bytes = await limited(
    await request(url.href, env, { signal }, fetcher),
    MAX_MODEL_BYTES,
  );
  validateGlb(bytes);
  return bytes;
}
export function validateGlb(bytes) {
  if (bytes.length < 28 || bytes.length > MAX_MODEL_BYTES)
    throw new ModelError("The returned model has an invalid size.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new ModelError("The service returned an invalid GLB model.");
  const length = view.getUint32(12, true);
  if (length > bytes.length - 20 || length > 1500000)
    throw new ModelError("Invalid model metadata.");
  let gltf;
  try {
    gltf = JSON.parse(
      new TextDecoder().decode(bytes.subarray(20, 20 + length)),
    );
  } catch {
    throw new ModelError("Invalid model metadata.");
  }
  if (
    gltf.asset?.version !== "2.0" ||
    !gltf.meshes?.length ||
    (gltf.nodes?.length || 0) > 1000
  )
    throw new ModelError("This model cannot be displayed safely.");
  if (
    (gltf.buffers || []).some((x) => x.uri) ||
    (gltf.images || []).some((x) => x.uri) ||
    (gltf.extensionsRequired || []).length
  )
    throw new ModelError(
      "Use a self-contained, uncompressed GLB with embedded textures.",
    );
  let vertices = 0,
    triangles = 0;
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives || []) {
      const count = gltf.accessors?.[p.attributes?.POSITION]?.count;
      if (!Number.isSafeInteger(count) || count < 1)
        throw new ModelError("The model geometry is invalid.");
      vertices += count;
      triangles += (gltf.accessors?.[p.indices]?.count || count) / 3;
    }
  if (vertices > 200000 || triangles > 100000)
    throw new ModelError(
      "The model is too detailed for the store. Generate a simpler model.",
    );
  return true;
}
export async function ensureModels(db) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS generated_models (id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS model_chunks (model_id TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(model_id,part))",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS model_generation_lock (id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, expires_at INTEGER NOT NULL)",
    ),
  ]);
}
export async function hashText(text) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function generateStored(image, env, fetcher = fetch) {
  await ensureModels(env.DB);
  const source = await hashText(image);
  const cached = await env.DB.prepare(
    "SELECT id FROM generated_models WHERE source_hash = ? LIMIT 1",
  )
    .bind(source)
    .first();
  if (cached) return { modelUrl: `/api/models/${cached.id}.glb`, cached: true };
  const token = crypto.randomUUID(),
    now = Date.now();
  const lock = await env.DB.prepare(
    "INSERT INTO model_generation_lock (id,token,expires_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at WHERE model_generation_lock.expires_at < ? RETURNING token",
  )
    .bind(token, now + 210000, now)
    .first();
  if (lock?.token !== token)
    throw new ModelError(
      "Another model is being generated. Wait for it to finish.",
      409,
    );
  try {
    const total = await env.DB.prepare(
      "SELECT COALESCE(SUM(size),0) AS total FROM generated_models",
    ).first();
    if (total.total + MAX_MODEL_BYTES > MAX_STORAGE)
      throw new ModelError(
        "The free model storage budget is full. Remove unused models before generating more.",
        409,
      );
    const bytes = await convertPhoto(image, env, fetcher);
    const id = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const statements = [
      env.DB.prepare(
        "INSERT OR IGNORE INTO generated_models (id,source_hash,size,created_at) VALUES (?,?,?,?)",
      ).bind(id, source, bytes.length, now),
    ];
    for (let i = 0, part = 0; i < bytes.length; i += CHUNK, part++) {
      statements.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO model_chunks (model_id,part,data) VALUES (?,?,?)",
        ).bind(id, part, bytes.slice(i, i + CHUNK).buffer),
      );
    }
    await env.DB.batch(statements);
    return { modelUrl: `/api/models/${id}.glb`, cached: false };
  } finally {
    await env.DB.prepare(
      "DELETE FROM model_generation_lock WHERE id=1 AND token=?",
    )
      .bind(token)
      .run();
  }
}
export async function modelResponse(req, env, id) {
  if (!env.DB) return new Response("Model not found", { status: 404 });
  let row;
  try {
    row = await env.DB.prepare("SELECT size FROM generated_models WHERE id=?")
      .bind(id)
      .first();
  } catch {
    return new Response("Model not found", { status: 404 });
  }
  if (!row) return new Response("Model not found", { status: 404 });
  const headers = {
    "Content-Type": "model/gltf-binary",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${id}"`,
    "X-Content-Type-Options": "nosniff",
  };
  if (req.headers.get("If-None-Match") === `"${id}"`)
    return new Response(null, { status: 304, headers });
  const rows = await env.DB.prepare(
    "SELECT data FROM model_chunks WHERE model_id=? ORDER BY part",
  )
    .bind(id)
    .all();
  if (
    !Number.isSafeInteger(row.size) ||
    row.size < 28 ||
    row.size > MAX_MODEL_BYTES
  )
    return new Response("Invalid model", { status: 500 });
  const bytes = new Uint8Array(row.size);
  let offset = 0;
  for (const chunk of rows.results) {
    const data = new Uint8Array(chunk.data);
    if (offset + data.length > bytes.length)
      return new Response("Invalid model", { status: 500 });
    bytes.set(data, offset);
    offset += data.length;
  }
  if (offset !== row.size)
    return new Response("Invalid model", { status: 500 });
  return new Response(bytes, {
    headers: { ...headers, "Content-Length": String(bytes.length) },
  });
}
