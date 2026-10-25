# Lunova — immersive store and protected CMS

A full-screen 3D storefront with a server-protected admin CMS. The current catalog contains 21 Lunova Secrets products in PKR, with locally copied featured photos. **Checkout, customer signup, real orders and payments remain disabled.**

## Customer experience

The 3D store opens by default with a minimal overlay: store name, product browser, bag, side-menu button and collapsed controls. Welcome banners, status badges, the permanent toolbar and the bottom instruction bar are removed. The left side-menu button expands collections and Admin inside the environment. Product details, catalog, cart and admin login are popups inside the same environment, including browser fullscreen. On desktop, cursor position maps to a full 360° horizontal panorama: centre faces forward, the quarter points face left/right, and the edges reach behind. Re-entering the store immediately aligns the view to the cursor position. Holding a mouse button pauses looking. Optional **Click to look around** captures the cursor at the centre for continuous turning; press **Esc** to release it. After menus, the view realigns on returning to the store. WASD/arrow keys walk. On phones, touch and drag anywhere on the 3D store to summon the thumb joystick. This gesture is touch-only and does not run on desktop mouse input. Tap products to open them; drag to walk. It hides on release; there is no static movement button. Drag in any direction to walk, with speed based on distance from its center; release to stop. The bottom-left Store controls button contains graphics, help, fullscreen, entrance reset, optional mouse capture and map visibility. The map starts hidden. Controls pause while a panel is open. Product view is available without 3D; graphics quality is a per-device customer setting.

Customers do not have Customize or public editing controls. Browser-local catalog overrides are no longer loaded. Products and store settings are fetched from the shared server; the demo bag remains device-local. The static catalog is a read-only fallback if the API is unavailable, and admin login fails closed if backend configuration is missing.

## Admin CMS

Open **Collections → Admin**, enter the administrator username/password, and sign in. There is no registration/signup route. The default server username is **Admin**; the owner sets the password in a Cloudflare **server secret**, never frontend JavaScript. No real password is committed to this repository.

- **Products:** create, edit, delete, update prices/descriptions/photos, assign a fixture and one of its three product positions, edit demo quantity limits, import public WooCommerce products, and import/export catalog JSON. Uploads are compressed JPG/PNG/WebP; HTTPS photo URLs work too. Save/Publish updates the shared virtual store. WordPress is a separate source and is not written back to.
- **Store & theme:** choose boutique, shoe shop, bakery, supermarket, beauty, jewelry, electronics, furniture or general store. Edit store name, tagline, description, contact/address/website/logo and five theme colors.
- **Niche fixtures:** clothing rails with hanging illustrative garments, shoe displays, glass bakery counters, supermarket shelving, beauty counters, jewelry showcases, electronics stands and home/furniture displays. Props are stylized illustrations of the niche, not exact 3D versions of the products; featured photos show the actual merchandise. Changing niche preserves products and existing collections. Twelve fixtures hold up to 36 individually selectable products; additional products remain in Product view.
- **Security:** server-authorized reads/writes, random sessions with hashed tokens, Secure/HttpOnly/SameSite cookies, origin checks on mutations, failed-login limits, eight-hour expiry, logout and password-rotation invalidation. Concurrent edits use revisions to prevent overwriting another session's save. Save errors leave published state unchanged.

New customer visits/reloads see the latest published database state. Open tabs do not automatically live-refresh. Cart hydration waits for the shared catalog before pruning unknown product IDs, so newly published products remain in a saved bag.

## Activate production CMS — owner action required

Follow **[docs/CMS_SETUP.md](docs/CMS_SETUP.md)**. In your Cloudflare account:

1. Create the free-tier **D1** database `lunova-cms` and execute `migrations/0001_cms.sql` in its Console.
2. Bind it to the Lunova Pages **Production** environment as **DB**.
3. Add **ADMIN_PASSWORD** as a **Secret** in Pages settings. Optionally set **ADMIN_USERNAME** to `Admin`. No VITE_ prefix, no password in GitHub or chat.
4. After review/merge, deploy the project and verify sign-in, a published edit, and the result in an incognito customer window.

This session has no Cloudflare account credentials, so the production database, binding and secret have not been created here. Local backend validation is separate from production activation. Free tiers have usage limits; check current quotas in your account. Preview deployments should use separate databases and credentials.

## Development

Node.js 22+ and npm are required. Cloud tasks already run in isolated checkouts; no worktree is needed.

```sh
cd /workspace/Lunova
npm ci
npm run db:local
# Copy .dev.vars.example to .dev.vars and privately enter local-only login values.
npm run build
npm run dev:cms
```

The local Pages/D1 runtime runs on port 8788 and persists ignored SQLite state under `.wrangler/state`. `wrangler.local.jsonc` is used by the database migration command only; Pages dev uses the supported CLI `--d1 DB` binding. No production database IDs are fabricated. In restricted cloud environments, set `XDG_CONFIG_HOME` to a writable directory and `WRANGLER_LOG_PATH` to a writable log path when running Wrangler; `WRANGLER_SEND_METRICS=false` disables CLI telemetry. Ordinary `npm run dev` starts frontend-only Vite; admin reports missing backend unless its API is provided.

```sh
npm test
npm run build
npm run build:functions
npm run test:e2e
npm audit --omit=dev
```

Node tests exercise the actual API and local D1 using Miniflare, including unauthenticated/forged requests, origin checks, validation, revisions, rate limits, password rotation, logout and expiry. Browser tests use a fixture API for UI flows, all nine niche layouts, theme/details, catalog CRUD, uploads, saved bag, hover/touch controls and fullscreen popups. A real local Pages/D1 browser integration was also run: login, publishing, a separate customer reading changes, unauthorized write denial and logout passed. Software WebGL checks do not establish physical-device frame rates.

Playwright uses `/usr/bin/chromium` where available; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for another installation or run `npx playwright install chromium`. The scene is lazy-loaded; Three.js is a large chunk (~250 KiB compressed), and real-device performance/accessibility review is still needed.

## Deployment and later migration

Cloudflare Pages builds `main` with `npm run build`, output `dist`, Node 22+. Pages automatically bundles root `functions/`. `public/_routes.json` routes only `/api/*` through Functions, keeping static files/photos on the asset CDN. The current production site is `https://shop.lunovasecrets.com`; its CMS update remains on a review branch until approved and configured. Protect production merges with CI/review. `public/_headers` permits HTTPS images and read-only API imports from the main Lunova Secrets site. Imported remote photos need CORS for WebGL; bundled photos do not.

For a hosting move, export D1 and the catalog, copy the frontend build and photos, and migrate or replace the server API. Static file upload alone does not migrate authentication or the database. SQLite-compatible store rows hold catalog/settings JSON. A WordPress/WooCommerce-backed API on existing hosting is a future option. Preserve the current WordPress site and email DNS during migration.

The bundled real product snapshot retains `originalImage` and source product URLs; photos were copied unchanged at the owner's request. It is not continuously synced to WooCommerce. The original eight labelled samples are retained as an explicit admin replacement option. Quantity limits are for the demo, not authoritative inventory. All VITE_* variables are public; never put credentials there.

See [AGENTS.md](AGENTS.md) for architecture, [docs/ROADMAP.md](docs/ROADMAP.md) for milestones, and [docs/CMS_SETUP.md](docs/CMS_SETUP.md) for setup/troubleshooting.

## Product displays

Each fixture now holds up to three independently clickable products. Clothing stores use wheeled garment rails and hanging illustrative garments with original photo tags; shoe stores use three-tier racks with shaped soles, collars and laces; bakeries use glazed counters, polished mirrored backs, trays and scored/iced pastries. Other store types retain their own shelf/counter designs. Procedural details are illustrative, not exact SKU replicas. Featured photos remain authoritative; no external generation or model-loader integration is used.

The first-person view includes a hand carrying a shopping basket, with up to four representative packages matching cart colours. The basket count follows the real demo cart and persists after reload; visible packages are bounded rather than one mesh per quantity. The basket is smaller on narrow screens, supports reduced-motion preferences, and the scene pauses continuous rendering behind menus and popups.

Catalog `layoutVersion: 2` preserves old fixture anchors and fills newly available positions with legacy catalog-overflow products once. This brings all 21 bundled products into the store. After that upgrade, explicit catalog-only selections remain catalog-only. Admin chooses **Display position** and **Position on fixture**; only occupied positions are blocked. Existing catalog backups still import, and new backups retain layoutVersion. Fixture footprints and collision geometry remain unchanged.

Review screenshots: [clothing rails and carried basket](docs/multiple-products-boutique.png), [bakery counters](docs/multiple-products-bakery.png), [shoe racks](docs/multiple-products-shoes.png). The latter two preview fixture changes with the existing catalog; switching store type never replaces the owner's inventory.

Verified for this change: 25 unit/backend tests and 26 Chromium browser tests passed (`npx playwright test --timeout=60000`), plus the production build and both Functions compilers. The nine-niche rebuild test allows 60 seconds for software WebGL. Physical-device frame rates are not verified.

The store now includes two stylized browsing shoppers and a cashier behind a service desk, built with procedural geometry and no external assets/services. Beautiful graphics enables subtle idle motion; Lightweight uses two static people. Reduced motion disables animation. Open **Store controls → Graphics → Hide store visitors** to hide people and the desk for this session. Optional collision boundaries prevent walking through them, while allowing escape if visitors are re-enabled around the player. NPCs do not walk, talk, take orders or interact with customer data.

NPC validation: 26 unit/backend tests, 15 relevant browser tests (camera/mobile/product/cart/Admin/visitor controls/reduced motion), production build and both Functions compilers passed.

[View the NPC preview](docs/store-npc-visitors.png).

For deployment cleanup, remove the unused `HF_TOKEN` secret and `HF_SPACE_URL` variable from Cloudflare Pages, and revoke the old provider token in its account settings. If the retired integration created database tables, `migrations/0002_remove_generated_models.sql` drops only those unused tables; it preserves products/settings, admin sessions and login limits. No automatic database deletion is performed by customer requests.
