# Hosted image-to-3D: free-service connector

## What is implemented and what is unverified

The store has an admin-only connector for a compatible hosted TripoSR Gradio API, durable model storage in the existing D1 database, and GLB rendering in its display cases. No local computer/GPU, new npm dependency, paid provider or billing fallback is involved. Nothing is generated when a customer visits the store.

**A real hosted conversion has not been verified.** This Codex environment's outbound proxy returns `CONNECT tunnel failed, response 403` for both Hugging Face and its Space host. This is a network restriction here, not evidence that the provider itself returned an application error. Tests exercise an explicitly synthetic GLB and mock provider; they establish transport/storage/UI behavior, not AI quality, current Space uptime, or acceptance of particular photos. Production activation requires a successful service check and actual conversion from the owner's deployment.

Default candidate: [Jose16062007/TripoSR](https://huggingface.co/spaces/Jose16062007/TripoSR), hosted at `https://jose16062007-triposr.hf.space`. The owner selected this candidate from the public Space search after the original default failed. Its API compatibility and actual inference still require verification from the deployed Admin panel; this workspace cannot reach HF hosts. The public demo may sleep, change API, disable API access or exhaust its queue. It is not an uptime-guaranteed service. A different **compatible TripoSR** Space can be configured with `HF_SPACE_URL`; this is not a generic adapter for TRELLIS/Meshy/other model APIs. Never silently switch to a paid provider or work around free quotas.

## Free account and private configuration

1. Create an account at [huggingface.co/join](https://huggingface.co/join) and verify its email. No subscription or connection to your computer is required to use a public hosted Space.
2. Open the [selected TripoSR demo](https://huggingface.co/spaces/Jose16062007/TripoSR) while signed in. Confirm that it is running, allows your intended use and produces an acceptable GLB from a representative product photo. If it does not, do not call the integration activated.
3. If the service requires authentication, open [Hugging Face access tokens](https://huggingface.co/settings/tokens), create a **Read** token named `Lunova 3D`. Do not grant write access or paste the token into chat/GitHub.
4. In Cloudflare → Workers & Pages → Lunova → Settings → Variables and Secrets, add a **Secret** named `HF_TOKEN` in Production. Paste the token there. Do not prefix it with `VITE_`. Redeploy after changing secrets. Preview tokens/bindings must be configured separately if testing a preview.
5. The default provider needs no URL setting. To use another compatible Space, add server variable `HF_SPACE_URL` equal to its HTTPS `.hf.space` origin (no extra path, credentials, port or query).
6. In Lunova's Admin → Products, open a product and click **Check free service**. It must report reachable; failures explain access, unsupported API or quota problems. The check itself does not start inference.
7. Click **Generate model from this photo**, then **Publish product**. Confirm the model appears in its case and in a separate customer browser. A saved model is independent of the provider's temporary download URL.

Hugging Face's [official ZeroGPU documentation](https://huggingface.co/docs/hub/spaces-zerogpu) describes free, limited GPU usage. The checked source lists 2 minutes/day unauthenticated and 5 minutes/day for a free account, but the Space's hardware, quota, access rules and current terms determine actual availability. Do not promise an unlimited free API. Calling an existing public Space differs from hosting your own GPU Space; free hosting eligibility can require an older verified account.

## Automatic workflow

- For an individual product, enable **Automatically generate a 3D model when publishing a new or changed photo**. This preference persists with the product. Publish generates and saves a model before applying the catalog change. Unchanged successful photos reuse their model. Existing products and new product forms default to opt-in so ordinary edits do not unexpectedly send photos to an external service.
- **Generate missing 3D models** handles the catalog sequentially, publishing each successful result, opting that product into future photo changes, and skipping unchanged models. The batch stops on its first error or quota limit; completed products stay published. It never automatically retries a failed request. Keep Admin open. Closing it cancels client work; already-started server work can finish saving a reusable asset, but does not itself publish the catalog.
- A failed individual automatic conversion still publishes the original photo, with an explicit warning and no invented model. A failed manual generation leaves the draft/photo intact. Changing a photo clears its old model so the wrong product is not displayed.
- **Use photo and standard mannequin** removes the model reference and disables automatic conversion for that product; publish to apply.
- Full graphics display generated models. Lightweight graphics retain the original photo and standard procedural fixture. The featured photo remains available in all cases. A failed GLB load falls back to the procedural display without taking down the store.

AI reconstruction is approximate. A photo of a person wearing lingerie may produce a model of that person, not a separate garment fitted to the existing mannequin. Hidden surfaces, lace, straps and transparency may be inaccurate. This integration does not promise exact fit or SKU geometry.

## Architecture and limits

- `server/models.js`: fixed/owner-configured HF origin; Gradio `/info`, multipart `/upload`, named `/call/preprocess` and `/call/generate` SSE calls. Supports modern `/gradio_api`, older unprefixed HTTP call routes, and legacy Gradio 4 HTTP/SSE queues discovered from `/config`. A missing `/call` route can fall back to the HTTP queue; accepted jobs and quota failures are never automatically resubmitted. It does not support Gradio versions exposing only the legacy WebSocket queue API.
- Images are resized in the administrator's browser to 512 px and uploaded as JPEG. Remote image reads need CORS and the site's existing CSP; for a blocked image, upload its photo directly. Inline uploads are decoded locally rather than fetched through CSP.
- `/api/admin/models/status` and `/api/admin/models/generate` require the existing server session. Generation requires same-origin requests. Credentials never enter the public catalog or browser bundle. The provider token is only sent to the configured HF origin; redirects and foreign model download hosts are rejected.
- Concurrent generation is restricted to one request using an expiring D1 lock. Source-image hashes reuse cached output. SSE/response sizes and network waits are bounded. Generation has a 150-second provider budget; normal HTTP requests have a 20-second timeout.
- Download validation checks GLB v2 header, metadata, embedded resources, declared geometry limits and size before persistence. Assets must be self-contained and require no optional compression extensions; maximum 4 MiB, 200k declared vertices and 100k declared triangles. Models are normalized to fit their existing cases and colliders.
- The initial storage budget is 64 MiB of raw models, stored as bounded binary BLOB chunks in D1. This avoids another storage account/binding, but D1 request/storage overhead and Cloudflare free quotas still apply. Old unreferenced models remain stored for recovery; there is no automatic destructive cleanup. A full budget requires an asset export/cleanup or a planned storage upgrade, not a paid fallback. Moving to R2/object storage is appropriate if the catalog outgrows this budget.
- `generated_models`, `model_chunks` and `model_generation_lock` tables are created idempotently on the first authenticated generation request. The existing production `DB` binding and admin setup are reused. Static photos and catalog data are not rewritten by inference. Export D1 along with the catalog when migrating; catalog JSON alone contains asset references, not the GLB binaries.
- Public `/api/models/<sha256>.glb` serves durable, content-addressed model bytes with immutable browser caching. The assets are public product media, not private documents.

## Verification

```sh
npm test
npm run test:e2e
npm run build
npm run build:functions
npm run build:functions:pages
```

Node tests cover Gradio request sequence, upload, SSE boundaries, quota failures, cross-host rejection, GLB limits, actual D1 persistence/cache/locking, catalog sanitization, session checks and cross-origin denial. Browser fixture tests cover automatic generation/publishing, render fetching, unchanged-image reuse, quota fallback and batch stop. These do **not** establish a successful live AI conversion.

Sources: [TripoSR repository and MIT license](https://github.com/VAST-AI-Research/TripoSR), [upstream Gradio implementation](https://github.com/VAST-AI-Research/TripoSR/blob/main/gradio_app.py), [Hugging Face ZeroGPU documentation source](https://github.com/huggingface/hub-docs/blob/main/docs/hub/spaces-zerogpu.md).

## Diagnosing a failed service check

The owner reported that the original public `stabilityai/TripoSR` demo fails during startup while installing `torchmcubes`: `scikit-build-core version 0.12.2 is too old. Minimum required version is 1.0`. That is a dependency failure in the third-party Space, before its API starts. Changing the website token or product photo cannot repair that Space; its owner must fix it, or a compatible running Space must be selected. No alternate Space has yet been verified from this workspace. Do not change the provider address based solely on a guessed demo name.

Connection handling follows bounded redirects only within the same HTTPS host, never forwards the token to a foreign redirect, trims surrounding token whitespace, and tries legacy API metadata when an unknown modern route serves HTML. Status failures distinguish connection/timeouts, HTTP access denial, non-JSON startup pages and unsupported APIs. The authenticated Admin check also reports whether this deployment has a non-empty server token, without returning it. These fixes improve compatibility and diagnosis; they do not repair a broken upstream installation or establish a successful conversion.

### Current free-hosting limits

The checked official [Spaces overview](https://github.com/huggingface/hub-docs/blob/main/docs/hub/spaces-overview.md) states that creating Gradio/Docker compute Spaces requires a paid plan, despite CPU Basic having no hourly charge. Free personal accounts in good standing can host eligible ZeroGPU Spaces; the ZeroGPU documentation requires a verified account older than 30 days. Therefore a newly created free account cannot be promised an immediate free CPU/ZeroGPU replacement. The attempted `hysts/TripoSR` alternative was reported as 404 by the owner. No working alternative hosted service has been verified. Preserve the no-paid-fallback requirement and do not claim changing HF_TOKEN repairs the original demo's dependency failure.

The current default follows the owner-selected Jose16062007/TripoSR candidate. If Production already defines `HF_SPACE_URL`, that explicit variable takes precedence; update it to `https://jose16062007-triposr.hf.space` and redeploy when selecting this candidate. A matching Running page alone does not establish API access or a successful model.
