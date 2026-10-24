# Working on Lunova

## Product and current scope

Lunova is a browser-based 3D supermarket. The owner is a non-developer and manages work through natural-language requests. Explain results and required account actions briefly and plainly. Read README.md and docs/ROADMAP.md before work. Phase 1 is demo-only: no real payments, orders, auth, or backend claims. Do not enable real transactions without explicit owner authorization.

## Architecture

- `src/App.jsx`: responsive shell, catalog, product details, demo cart, settings and guidance.
- `src/components/StoreScene.jsx`: procedural store, shelf products, textures, frame-based player controls, graphics fallback.
- `src/lib/products.js`: local sample product catalog and USD formatting. Replace via a dedicated data layer in Phase 2.
- `src/lib/world.js`: shelf colliders, bounded movement with substeps, safe aisle positions.
- `src/lib/controls.js`: transient touch movement shared with the render loop.
- `src/lib/cart.js`: pure cart validation, stock caps and integer-cent totals.
- `src/lib/store.js`: Zustand UI/world state and versioned localStorage cart; saved cart is sanitized on hydration.
- `src/styles.css`: Tailwind import and responsive design system / component styles. Do not require remote fonts or assets.
- `tests/core.test.js`: data/cart/collision unit tests; `tests/browser`: Playwright interaction tests.

## Workflow

Each cloud task is already isolated. Use the existing `/workspace/Lunova` checkout; do not create a worktree unless requested. Inspect Git status and preserve user changes. Make targeted edits on feature branches; do not rebuild existing functionality unnecessarily. Keep dependencies locked; use `npm ci` for restoration. Node 22+ (cloud currently has Node 24). Run `npm test`, `npm run build`, and browser tests for UI/3D changes. Never claim unrun checks pass. Record any blocked checks and known limitations. Commit logically and prepare a PR when a base branch and GitHub access exist; never invent review links.

## Safety and future backend

No secrets in source, logs, scripts, commits, or chat. All VITE_* variables are public. Supabase service-role/secret keys must never enter browser configuration. Future checkout must validate prices/stock server-side in an atomic transaction and use RLS on every exposed table; enforce admin roles on the server. Do not add real personal data collection during Phase 1. Do not deploy or enable orders/payments without the owner's authorization. Configure production merges to trigger Cloudflare only after review, using protected branches.

## 3D conventions

Keep CPU/GPU work bounded, cap device pixel ratio, reuse geometry/materials/textures, use simple shapes and no unnecessary physics library. Movement must be frame-rate independent and collider data must stay in sync with shelf placement. Touch and keyboard controls need equivalent functionality. A 2D catalog is always available. Any added model/texture must have a compatible license and documented source.
