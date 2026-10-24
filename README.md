# Lunova Secrets — virtual boutique

A walkable lingerie boutique built with React, Vite, JavaScript, React Three Fiber / Three.js, Tailwind and Zustand. Grocery shelves have been replaced with brass clothing rails, featured-image displays, and stylized dress forms. **Demo only: no payments, customer accounts, live inventory or real orders.**

## For the store owner

Open **Customize** above the 3D view (or **Customize boutique** in the sidebar).

- **Add/edit products:** name, collection, price, sizes/note, description, featured image, garment color, and demo bag quantity limit.
- **Display position:** choose a numbered display (1–12) or Catalog only. Two products cannot occupy one display. All products remain searchable in Product view.
- **Presentation:** choose a featured photo on a clothing rail, or a stylized mannequin beside the featured photo. A mannequin shows a generic colored garment, not an exact 3D reproduction or virtual try-on. Upload a photo of a mannequin wearing your product if you want its actual appearance shown.
- **Upload photo:** JPG, PNG or WebP, up to 10 MB; resized locally to 900px before saving. HTTPS image URLs are preferable for larger catalogs.
- **Import from my website:** reads public WooCommerce product data from `https://lunovasecrets.com/wp-json/wc/store/v1/products`, paginating up to 500 products. Review the product count/currency before replacing the local catalog. Imports names, descriptions, featured image URLs, public prices, currency and product-page links. Collections are inferred from names/categories and can be corrected in the editor. First 12 products get 3D display positions; others are Catalog only.
- **Import file:** accepts an exported Lunova catalog JSON or an array of public WooCommerce Store API product objects. If your host blocks cross-site API requests, open the public product data link shown in the editor, save the JSON from your browser, then import that file. A single API page contains at most 100 products; use direct website import for pagination.
- **Export catalog:** download `lunova-catalog.json` to back up edits. Share this file with Codex to publish the collection for everyone by updating `src/data/catalog.json` on a reviewed branch.
- **Currency:** imported from WooCommerce, or editable as a 3-letter currency code. Changing the code changes the label only; it does not convert prices.

**Editor changes are stored only in your current browser.** They do not update WordPress or other visitors. The editor is deliberately public and local, not a secure admin dashboard. A shared, authenticated editing system is a future phase. Use Export before clearing browser data or changing devices. Catalog saves validate data and report storage errors without overwriting the last valid catalog.

The published catalog now contains 21 real products from the owner-supplied WooCommerce public export, in PKR. The live public feed was also reached successfully and its 21 product IDs matched the supplied export. Featured images were downloaded without modification into `public/products/catalog/` (about 534 KiB total) to avoid external hotlink/CORS dependencies in 3D and make hosting migration easier. Each product retains its original image URL and website link. The original eight labelled sample illustrations remain available via Restore sample boutique; Load published website collection restores the real catalog. This is a snapshot, not automatic synchronization. The browser cross-origin importer is still dependent on the source CORS policy; its handling is tested with fixtures. Import stock is **not authoritative**: unavailable items get a zero demo cap; otherwise a default cap of ten is used. Prices can become stale after import. No checkout is enabled.

## Run in Codex Cloud / locally

Use Node.js 22+ and npm. Use the existing checkout; cloud tasks are already isolated and do not need a worktree.

```sh
cd /workspace/Lunova
npm ci
npm run dev -- --port 5173 --strictPort
```

On your own computer use your actual checkout path. No runtime variables, credentials, database or Supabase project are required. Runtime API import depends on the source site's public WooCommerce Store API and CORS policy. Never put WordPress passwords, WooCommerce consumer secrets or service-role keys in client code or VITE_* variables.

### Controls and fallback

WASD / arrow keys walk, dragging looks around, clicking a product photo or mannequin opens details. Touch devices have an arrow pad. Optional mouse capture uses “Enter walk mode”; Esc releases it. Collection shortcuts move to safe positions. The entrance reset restores the camera. Settings → Lightweight reduces resolution and disables shadows. Product view remains usable without 3D.

### Validation

```sh
npm test
npm run build
npm run test:e2e
```

Unit tests validate the supplied catalog and cart mutation, edited/deleted product reconciliation, fixture collisions, safe spawns, catalog validation, image/link protocols, duplicate display prevention, and paginated WooCommerce data conversion. Browser tests cover rendered 3D product selection, movement/collision, mobile controls, bag persistence, search, editor CRUD/persistence and import success/failure with mocked source responses. The source feed and downloaded image files were checked; real-device performance and automatic source synchronization remain separate checks.

Playwright uses `/usr/bin/chromium` when available. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to another installed executable, or run `npx playwright install chromium`. CI installs its browser/dependencies. Headless Linux uses software WebGL. The Three.js chunk is large (~250KB compressed); the 3D scene is lazy-loaded. Hardware and accessibility review are still needed before a commercial launch.

## Deployment and later hosting migration

The existing Cloudflare Pages project serves `https://lunova-8dy.pages.dev`; the owner is connecting `shop.lunovasecrets.com` through a CNAME. DNS/HTTPS activation has not been independently verified here. Git integration builds the approved `main` branch with `npm run build`, output `dist`, Node 22. Protect production merges with required CI/review. Feature branches can have Cloudflare preview deployments if enabled. A feature branch push does not establish that production has changed.

`public/_headers` sets browser security headers. Images may load from HTTPS hosts; API fetches are limited to the Lunova Secrets origin(s). Remote photo servers must permit CORS for photos used as WebGL textures. If not, the 3D display reports photo unavailability while Product view can still display the image; uploading/local-copying licensed photos avoids that dependency. No credentials are sent by the public importer. Additional API origins require an intentional CSP update.

To migrate later: upload `dist` contents to static HTTPS hosting for the `shop` subdomain, verify it on a staging address, then change only that subdomain's DNS. Keep the WordPress site and email records intact. A future WooCommerce-backed system can keep products, orders and inventory in your existing hosting database. The present demo has **no server database** and does not require Cloudflare-specific application APIs.

## Architecture and future work

See [AGENTS.md](AGENTS.md) for future Codex sessions, [docs/ROADMAP.md](docs/ROADMAP.md) for milestones, and [boutique screenshot](docs/boutique-desktop.png) for the current design. The older grocery prototype screenshot remains for history.
