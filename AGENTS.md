# Working on Lunova

## Product and current scope

Lunova Secrets is a browser-based 3D lingerie boutique, replacing the original grocery prototype. The owner is a non-developer and manages work through natural-language requests. Explain results and required account actions briefly and plainly. Read README.md and docs/ROADMAP.md before work. Phase 1 is demo-only: no real payments, orders, auth, or backend claims. Do not enable real transactions without explicit owner authorization.

## Architecture

- `src/App.jsx`: responsive shell, catalog, product details, demo cart, settings and guidance.
- `src/components/StoreScene.jsx`: procedural clothing rails, photo panels, stylized mannequin forms, textures, frame-based player controls, graphics fallback.
- `src/lib/products.js`: collection definitions, default JSON catalog and currency formatting. `src/data/catalog.json` is the published snapshot of 21 real WooCommerce products in PKR. `src/data/sample-catalog.json` retains the original eight labelled samples.
- `src/lib/world.js`: 12 fixed display footprints, bounded movement with substeps, safe collection positions.
- `src/lib/controls.js`: transient touch movement shared with the render loop.
- `src/lib/cart.js`: pure cart validation, stock caps and integer-cent totals.
- `src/lib/store.js`: Zustand UI/world/catalog state, versioned localStorage cart, validated device-local catalog saves. Cart hydration and product edits reconcile stock/deleted items.
- `src/styles.css`: Tailwind import and responsive design system / component styles. No remote fonts. Imported product images may use HTTPS; preserve fallback behavior.
- `tests/core.test.js`: data/cart/collision unit tests; `tests/browser`: Playwright interaction tests.

- `src/lib/catalog.js`: pure catalog validation, safe image/link protocols, HTML-to-text conversion, WooCommerce Store API transformation and public paginated import (no credentials).
- `src/components/CatalogEditor.jsx`: local demo editor, photo resize/upload, import preview, JSON backup/restore, CRUD and display slots. This is not secure administration and does not change WordPress or other visitors.
- `src/components/Modal.jsx` and `ProductArt.jsx`: reusable dialog and featured-image/fallback components.

## Owner direction

Keep developing on Cloudflare for now. The owner plans to move files/database onto existing hosting later and keep WordPress at lunovasecrets.com; the boutique uses shop.lunovasecrets.com. Evaluate WooCommerce before adding a separate backend. The owner supplied the 21-product public export; live feed IDs were matched and featured images copied unchanged into `public/products/catalog/`. Each real product retains originalImage provenance. No automatic synchronization is enabled. Use the publicly visible source catalog when available; do not invent real listings or claim a successful live import when blocked. Demo quantity caps are not live inventory. A product photo does not create an accurate 3D garment; mannequin mode is stylized and paired with the photo. For public catalog changes use a reviewed seed JSON commit. Local editor changes are device-only and must be clearly labelled as such.

## Workflow

Each cloud task is already isolated. Use the existing `/workspace/Lunova` checkout; do not create a worktree unless requested. Inspect Git status and preserve user changes. Make targeted edits on feature branches; do not rebuild existing functionality unnecessarily. Keep dependencies locked; use `npm ci` for restoration. Node 22+ (cloud currently has Node 24). Run `npm test`, `npm run build`, and browser tests for UI/3D changes. Never claim unrun checks pass. Record any blocked checks and known limitations. Commit logically and prepare a PR when a base branch and GitHub access exist; never invent review links.

## Safety and future backend

No secrets in source, logs, scripts, commits, or chat. All VITE_* variables are public. Supabase service-role/secret keys must never enter browser configuration. Future checkout must validate prices/stock server-side in an atomic transaction and use RLS on every exposed table; enforce admin roles on the server. Do not add real personal data collection during Phase 1. Do not deploy or enable orders/payments without the owner's authorization. Configure production merges to trigger Cloudflare only after review, using protected branches.

## 3D conventions

Keep CPU/GPU work bounded, cap device pixel ratio, reuse geometry/materials/textures, use simple shapes and no unnecessary physics library. Movement must be frame-rate independent and collider data must stay in sync with display fixture placement. Touch and keyboard controls need equivalent functionality. A 2D catalog is always available. Any added model/texture must have a compatible license and documented source.
