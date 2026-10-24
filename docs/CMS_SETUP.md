# Activate the shared store CMS (owner steps)

The code supports a shared CMS on Cloudflare Pages Functions and D1. Source code alone does not create a database, secret, binding or deployment. Those steps need your Cloudflare account. Keep this branch in preview until the owner reviews it and the setup is complete. No customer signup, checkout, payments or real order processing is enabled.

## 1. Create the free-tier database

In Cloudflare, open **Storage & databases → D1 SQL Database → Create database**. Name it **lunova-cms** and choose the free plan available in your account. Check the current account quotas; Pages Functions and D1 have usage limits. This small single-store CMS is designed to use few requests, with static photos served without Functions.

## 2. Create the tables

Open the database's **Console**, paste the SQL below, then select **Execute / Run**. This is the same schema as `migrations/0001_cms.sql`. It is safe to run again because it uses IF NOT EXISTS.

```sql
CREATE TABLE IF NOT EXISTS store_config (id INTEGER PRIMARY KEY CHECK (id = 1), catalog TEXT NOT NULL, settings TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS admin_session_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_limits (key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_start INTEGER NOT NULL);
```

The initial 21-product snapshot remains the fallback until your first successful publish. You do not need to enter products into SQL manually.

## 3. Connect it to your Pages project

Open **Workers & Pages → your Lunova Pages project → Settings → Bindings → Add binding → D1 database**. Use variable/binding name **DB** and select **lunova-cms**. Apply this to the **Production** environment. Use a separate database and password for Preview deployments if you enable admin there; do not bind preview code to the production CMS database.

## 4. Set the server-only login

In the Pages project's **Settings → Variables and Secrets**, select **Production**:

- Add **ADMIN_USERNAME** as a normal text variable with value **Admin** (omitting it also defaults to Admin).
- Add **ADMIN_PASSWORD** as a **Secret / encrypted variable**, entering the password you selected. Do not prefix it with VITE_. Do not put it into GitHub, a frontend file, a screenshot, or a chat message.

There is no signup route. The password is compared on the server. A password change invalidates existing sessions. The owner requested an initial password in chat; it is deliberately not copied into source or documentation. Use a unique stronger value before a commercial launch. Sessions expire after eight hours and failed logins are limited to six attempts per fifteen-minute window per request address.

## 5. Publish and verify

After reviewing/merging the feature branch into **main**, open **Deployments** and confirm a new deployment completes (or use **Retry deployment** if the binding/secret was added afterward). The Pages Git build remains `npm run build`, output `dist`, Node 22+. Pages automatically bundles the root `functions` directory. No production Wrangler config with database IDs is required; configure the actual binding in the dashboard.

Open `https://shop.lunovasecrets.com`, expand **Collections → Admin**, enter your username/password, then choose:

- **Products:** add, edit, delete, import/export and publish product data or photos.
- **Store & theme:** store type, name, tagline, description, contact/address/website/logo and colors.

Use **Publish** to save. Check the result in a separate private/incognito window: that confirms a customer reads shared data instead of an admin's local draft. Existing open storefront tabs pick up changes when reloaded. Sign out when finished. If a conflict message appears, export your changes as needed, then use Reload and reapply them; another session published a newer revision.

## Store types and limits

Boutique, shoes, bakery, supermarket, beauty, jewelry, electronics, furniture and general store have distinct procedural fixtures. Boutique uses glass mannequin cases; bakery uses glass counters; supermarket uses shelf rows. Decorative garments/props are stylized and do not replace actual featured photos. Changing type does not delete or replace products. Existing product collections are retained so merchandise does not disappear. Up to twelve products occupy fixed 3D positions; additional products remain searchable in Product view. Fixture footprints stay fixed for collision safety.

The CMS publishes the virtual store only. A WooCommerce import is read-only; changes do not write back to WordPress or continuously sync with it. Stock remains a demo quantity limit. Photos can use HTTPS URLs or compressed uploads; the shared catalog is capped at 1.5 MB encoded to fit D1 row limits. Export your catalog periodically. Theme colors change the interface and environment; test readable colors on mobile.

## Move hosting later

D1 stores SQLite-compatible JSON rows. Export the database through Cloudflare and export the catalog from the CMS before migration. The frontend remains a static Vite build; the API must also be moved or replaced on your new hosting. Simply copying `dist` without the API would leave read-only bundled products and a disabled admin login. Keep the old WordPress site and email DNS records intact during migration. Replacing the API with a WordPress/WooCommerce-backed implementation is a separate tested task.

## Local development (no Cloudflare credentials)

```sh
npm ci
npm run db:local
# Copy .dev.vars.example to .dev.vars and enter a local-only password privately.
npm run build
npm run dev:cms
```

`wrangler.local.jsonc` configures only the local DB migration command (database local-DB), with no production database ID. Pages dev uses the supported --d1 DB CLI flag. In restricted cloud machines use a writable XDG_CONFIG_HOME and WRANGLER_LOG_PATH. The local runtime serves the build and API on port 8788 and persists SQLite under ignored `.wrangler/state`. `.dev.vars` is ignored; never commit it. The ordinary `npm run dev` is still useful for frontend-only work but does not start the admin API; the customer view falls back to bundled products and admin reports missing setup.

Checks: `npm test`, `npm run build`, `npm run build:functions`, `npm run test:e2e`. Node tests exercise real local D1 via Miniflare. Browser UI tests use a fixture API; a combined local Pages/D1 browser check is also needed for runtime integration. Never substitute a mocked UI login for a server authorization test.

### Pages Functions compiler compatibility

The hosted Pages Functions builder may use Wrangler 3 even when the local development dependency is newer. Catalog seed data is stored in plain JavaScript default-export modules in src/data to work with both builders. The CMS still imports and exports JSON files. Do not add JSON import attributes to shared modules used by Functions.

CI also runs npm run build:functions:pages with the hosted builder version (Wrangler 3.114.17), in addition to the modern local Functions build, to catch this incompatibility before deployment.
