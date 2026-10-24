# Working on Lunova

## Product and current scope

Lunova Secrets is a browser-based 3D lingerie boutique, replacing the original grocery prototype. The owner is a non-developer and manages work through natural-language requests. Explain results and required account actions briefly and plainly. Read README.md and docs/ROADMAP.md before work. Customer shopping is demo-only: no real payments, orders or signup. A server-protected admin CMS uses Pages Functions + D1; do not claim production activation until the owner configures the database and secret. Do not enable real transactions without explicit owner authorization.

## Architecture

- `src/App.jsx`: immersive viewport shell with a permanently mounted scene, collapsible overlay sidebar, popup catalog/details/cart/settings and guidance.
- `src/components/StoreScene.jsx`: procedural clothing rails, photo panels, stylized mannequin forms, textures, frame-based player controls, graphics fallback.
- `src/lib/products.js`: collection definitions, default catalog data module and currency formatting. `src/data/catalog.js` is the published snapshot of 21 real WooCommerce products in PKR. `src/data/sample-catalog.js` retains the original eight labelled samples.
- `src/lib/world.js`: 12 fixed display footprints, bounded movement with substeps, safe collection positions.
- `src/lib/controls.js`: transient touch movement shared with the render loop.
- `src/lib/cart.js`: pure cart validation, stock caps and integer-cent totals.
- `src/lib/store.js`: Zustand UI/world state, shared API catalog/settings, server-authenticated admin state and a versioned localStorage cart. Unknown cart IDs are preserved until shared catalog loading finishes.
- `src/styles.css`: Tailwind import and responsive design system / component styles. No remote fonts. Imported product images may use HTTPS; preserve fallback behavior.
- `tests/core.test.js`: data/cart/collision unit tests; `tests/browser`: Playwright interaction tests.

- `src/lib/catalog.js`: pure catalog validation, safe image/link protocols, HTML-to-text conversion, WooCommerce Store API transformation and public paginated import (no credentials).
- `src/components/CatalogEditor.jsx`: protected CMS product editor, photo resize/upload, import preview, JSON backup/restore, CRUD and display slots. Publish awaits the server and updates all customers on their next load, without writing to WordPress.
- `src/components/Modal.jsx` and `ProductArt.jsx`: dialogs portal into #store-overlay-root inside the environment so they remain visible in fullscreen; featured-image/fallback components.

## Owner direction

Keep developing on Cloudflare for now. The owner plans to move files/database onto existing hosting later and keep WordPress at lunovasecrets.com; the boutique uses shop.lunovasecrets.com. Evaluate WooCommerce before adding a separate backend. The owner supplied the 21-product public export; live feed IDs were matched and featured images copied unchanged into `public/products/catalog/`. Each real product retains originalImage provenance. No automatic synchronization is enabled. Use the publicly visible source catalog when available; do not invent real listings or claim a successful live import when blocked. Demo quantity caps are not live inventory. A product photo does not create an accurate 3D garment; mannequin mode is stylized and paired with the photo. Bundled seed changes use reviewed commits; authenticated CMS publishing updates shared D1 data directly. Browser-local catalog overrides are no longer customer data sources. All shared writes require server authentication. Cloudflare database/secret setup is owner-controlled; never hardcode the requested password or expose it through VITE_ variables. No signup route.

- `src/lib/shop.js`: nine store presets, categories, shared store defaults, validation and theme contrast.
- `src/components/AdminPanel.jsx`: login-only gate and products/settings tabs; no public Customize controls.
- `src/components/StoreFixtures.jsx`: niche-specific glass cases, shelves, counters and illustrative props. Fixed footprint colliders stay in world.js.
- `functions/api/[[path]].js` routes to `server/handler.js`; public read, protected admin login/session/store/logout, D1 storage. Native Web Crypto and SQL bound parameters, no frontend credentials.
- `migrations/0001_cms.sql`: D1 schema; `wrangler.local.jsonc` only configures the local database CLI, not production deployment. Pages dev uses CLI bindings. Production DB binding and credentials must be configured in Cloudflare.
- `tests/backend.test.js`: actual Miniflare/D1 API authorization tests; `tests/browser/helpers/cms.js` mocks the API for UI tests. Do not treat fixture login as security verification.

## Workflow

Each cloud task is already isolated. Use the existing `/workspace/Lunova` checkout; do not create a worktree unless requested. Inspect Git status and preserve user changes. Make targeted edits on feature branches; do not rebuild existing functionality unnecessarily. Keep dependencies locked; use `npm ci` for restoration. Node 22+ (cloud currently has Node 24). Run `npm test`, `npm run build`, `npm run build:functions`, and browser tests for UI/3D changes. Never claim unrun checks pass. Record any blocked checks and known limitations. Commit logically and prepare a PR when a base branch and GitHub access exist; never invent review links.

## Safety and future backend

No secrets in source, logs, scripts, commits, screenshots, or chat. Local .dev.vars is ignored. Production ADMIN_PASSWORD is a Cloudflare server secret, not a Codex proxy variable. Admin username defaults to Admin. Every write checks the HttpOnly session and request origin; preserve rate limits, expiry, password-rotation revocation and optimistic revisions. All VITE_* variables are public. Supabase service-role/secret keys must never enter browser configuration. Future checkout must validate prices/stock server-side in an atomic transaction and use RLS on every exposed table; enforce admin roles on the server. Do not add real personal data collection during Phase 1. Do not deploy or enable orders/payments without the owner's authorization. Configure production merges to trigger Cloudflare only after review, using protected branches.

## 3D conventions

Keep CPU/GPU work bounded, cap device pixel ratio, reuse geometry/materials/textures, use simple shapes and no unnecessary physics library. Desktop hover look maps absolute canvas coordinates to yaw ±π and pitch ±1.1 rad around neutral; centre always faces forward. Re-entering the canvas must immediately align without accumulating cursor deltas. Optional pointer lock keeps the cursor centred for continuous turning; Escape releases capture. Preserve absolute cursor alignment across menu, focus and pointer-lock transitions; mobile touch dragging moves via the floating joystick, and taps still select products. Pause movement/look while sidebar/catalog/dialogs are open. UI pointer events must not rotate the camera. Never unmount the scene when opening catalog/details, and do not exit fullscreen to show dialogs. Movement must be frame-rate independent and collider data must stay in sync with display fixture placement. Touch and keyboard controls need equivalent functionality. A 2D catalog is always available. Any added model/texture must have a compatible license and documented source.

Development dependency overrides keep Miniflare’s Sharp/Undici on patched compatible versions. npm audit was checked; retest backend and Functions builds when changing these overrides. Do not weaken TLS/signature verification to install tools.

Cloudflare Pages uses an older Functions bundler (Wrangler 3.114.17). Keep shared catalog seed modules as plain JavaScript default exports; do not reintroduce JSON import attributes (`with { type: "json" }`) into the Functions import graph. CMS JSON import/export remains supported.

Keep the customer HUD minimal, especially on mobile: no welcome/status banners, permanent toolbar or footer instructions. Map is hidden by default; the floating touch joystick only appears while touching the mobile canvas anywhere; graphics/help/fullscreen/reset are in Store controls. Preserve accessible labels and leave the camera canvas full-size when expanding controls.

TouchJoystick.jsx uses pointer capture and proportional movement; reset on release/cancel/blur, collapse and modal/sidebar opening. Desktop captured look pauses while any mouse button is held, tracks the held cursor to avoid release jumps, and preserves touch drag and product clicks.

The floating joystick listens only to touch pointers on the canvas when the primary pointer is coarse. Never place a full-screen input overlay over products or UI. Suppress clicks after a walk gesture, preserve product taps and desktop mouse capture.

## Hosted image-to-3D connector

Read docs/IMAGE_TO_3D.md before changing generation. server/models.js uses a compatible hosted TripoSR Gradio API, authenticated admin endpoints, source-hash caching, an expiring single-flight D1 lock, and bounded self-contained GLB persistence. Tables are created idempotently on the first admin generation request. HF_TOKEN is server-only; HF_SPACE_URL is restricted to an HTTPS hf.space origin. Never expose the token, follow foreign output URLs, enable billing/paid fallback, evade daily limits, or claim real conversion based on fixtures. The development proxy currently blocks Hugging Face: no real generation or provider uptime is verified. Owner account/configuration and actual service checks remain necessary.

Catalog modelUrl values must be local content-addressed /api/models/<64-hex>.glb paths. Product autoModel is explicit opt-in; generated assets retain source image hashes. Bulk generation is sequential, publishes only completed models and stops on first failure. Keep the original photo, clear stale models when photos change, preserve cancellation and share revision checks. GeneratedProductModel normalizes to fixed case bounds, disposes resources and falls back without unmounting the store; lightweight graphics use procedural props. Generated media is approximate and may include the photographed person. D1 exports must include model chunks for future migration. Unit/provider fixture and browser tests are separate from successful live GPU verification.

The owner confirmed that stabilityai/TripoSR has a torchmcubes/scikit-build-core startup error and hysts/TripoSR returns 404. These are external provider availability failures, not proof of a bad token. Current HF documentation says new Gradio/Docker compute Spaces require a paid plan even when CPU Basic has zero hourly cost; eligible free ZeroGPU hosting requires a verified account older than 30 days. Do not promise newly created accounts free self-hosted CPU Spaces or publish speculative provider URLs as working. Connection diagnostics now allow bounded same-origin redirects and distinguish network, timeout, access and non-JSON/API failures without returning credentials.

The owner subsequently selected https://huggingface.co/spaces/Jose16062007/TripoSR from the public Space search. This is now the default HF origin (jose16062007-triposr.hf.space); an explicit HF_SPACE_URL retains priority. Treat API compatibility and real conversion as unverified until the deployed administrator checks and completes a single test. Do not call a Running UI alone a successful integration.
