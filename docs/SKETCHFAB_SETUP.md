# Sketchfab connection and model imports

The integration is implemented on a feature branch, not activated on the live store. Public search does not require a Sketchfab account. Authenticated downloads require a registered OAuth app, hosting configuration and your explicit Sketchfab consent. No model has been downloaded, published or substituted into the existing store.

## Your next action: request OAuth app registration

Sketchfab's official [OAuth instructions](https://sketchfab.com/developers/oauth#registering-your-app) currently say to **contact their team** to register an application. Open that page and use its **contact us** link ([contact page](https://sketchfab.com/about#contact)). Send the following, replacing only the username:

> Please register an OAuth application for Lunova 3D Store.
>
> Application name: Lunova 3D Store
>
> Grant type: Authorization Code (server-side confidential client)
>
> Redirect URI: https://shop.lunovasecrets.com/api/sketchfab/callback
>
> Sketchfab username: YOUR SKETCHFAB USERNAME
>
> Use: search public models with the Data API and download only models offered through the official Download API after user authorization. Preserve creator attribution and licenses for a commercial browser-based 3D store.

They provide a Client ID and Client Secret. Never paste the secret or your Sketchfab password in chat, GitHub, a product field or a VITE_ variable.

## Save credentials privately

A Codex Cloud environment draft has been saved with the existing domain allowlist preserved and these additions: `sketchfab.com`, `api.sketchfab.com`, and `media.sketchfab.com` (public search thumbnails). It declares:

| Name | Where / purpose |
| --- | --- |
| SKETCHFAB_CLIENT_ID | Non-secret environment variable |
| SKETCHFAB_REDIRECT_URI | Non-secret variable with the exact callback above |
| SKETCHFAB_CLIENT_SECRET | Private environment secret, destination `sketchfab.com` |

Open this project's **environment settings**, review the saved draft, enter the supplied ID/secret in their corresponding fields, save, and publish the environment configuration. A draft save alone does not publish it. Live public API access was verified during this task; future environments still need the saved domains. Proxy-backed Codex secrets may be placeholders until sent to their allowed HTTPS destination; do not write or print their values.

Codex Cloud development credentials **do not automatically configure Cloudflare production**. The website's OAuth code runs in Cloudflare Pages Functions. After app registration, production needs the same ID, secret and callback in Pages settings, plus a private encryption key. The account is not connected until the final authorization step succeeds.

## Hosting activation (Codex can guide this after registration)

1. In Cloudflare, open the Lunova Pages project's **Settings → Variables and Secrets**. Keep existing admin credentials and DB binding. Add `SKETCHFAB_CLIENT_ID` and `SKETCHFAB_REDIRECT_URI` as variables. Add `SKETCHFAB_CLIENT_SECRET` and `SKETCHFAB_TOKEN_KEY` as encrypted secrets. No frontend credential variables are used.
2. `SKETCHFAB_TOKEN_KEY` must be a random 32-byte key represented as 64 hexadecimal characters. Generate it privately in an authorized terminal/password tool; do not send it through chat. For an already authenticated Cloudflare CLI, a developer can send it directly without displaying it:

   ```sh
   openssl rand -hex 32 | npx wrangler pages secret put SKETCHFAB_TOKEN_KEY --project-name YOUR_ACTUAL_PAGES_PROJECT_NAME
   ```

   Use the actual project name from Cloudflare, not an assumed hostname. This repository does not assume Cloudflare credentials are available. The key is for local cryptography in the Worker, so it cannot be a Codex proxy-only placeholder.
3. Open **Storage & databases → D1**, select the database bound as `DB`, and use its Console to run the two statements in [0003_sketchfab.sql](../migrations/0003_sketchfab.sql). This adds OAuth tables without changing products, inventory or orders. Migration 0001 remains required for admin sessions. For local development, use the existing local D1 configuration and run 0003 as an additional migration.
4. Review and publish the feature branch. No automatic deployment was performed for this work.
5. On the website, open sidebar **Admin**, sign in, and choose **3D models → Connect Sketchfab**. You are redirected to Sketchfab to sign in/authorize there. Return to Admin → 3D models to check “Sketchfab connected.” Your Sketchfab password is never requested by Lunova.

The callback must use exactly the registered HTTPS origin and path. Preview deployments with another hostname require their own registered callback/configuration; they cannot silently reuse production authorization.

## Search, authorized downloads and import

- Enter a keyword (default **supermarket shelf**), license and download availability, then search. Search resolves short model license IDs through `/v3/licenses`. Results preserve creator/profile, source model link and full license link. Non-downloadable and unsupported licenses remain viewable as references.
- The commercial store import path currently supports **CC0, CC BY and CC BY-SA**. Noncommercial, NoDerivatives, editorial and Sketchfab-specific/unknown licenses are deliberately excluded from this automated import workflow. BY-SA derived model files retain the same license; original credit text and license links stay with the files.
- After connecting, review the chosen license, tick its acknowledgement and click **Prepare authorized download**. The server checks the current public model and license again, then calls `/v3/models/{uid}/download` with the server-held OAuth bearer token. It does not scrape the viewer or bypass availability checks.
- The returned **Download official archive** link is short-lived and goes directly to the official archive host. Click **Save creator credits** too. Signed archive links are not committed or stored in public metadata.
- For an immediate local check, use **Choose GLB** or **Choose glTF folder**. Preview stays in your browser and never uploads/publishes a model. glTF supporting files must remain in their folder. The local preview blocks remote resources and traversal paths; full bundle limit is 25 MB, 100 files and 500,000 mesh vertices. Compressed Draco/Meshopt/KTX2 models need an uncompressed export for this first workflow.
- Give Codex the authorized archive and saved credits JSON to finish repository import and review. Codex handles the technical command:

  ```sh
  npm run models:import -- /path/to/official-archive.zip /path/to/creator-credits.json
  ```

  Python 3 is required only for bounded ZIP extraction. GLB files and already extracted glTF directories work too. The importer refuses duplicate asset IDs, symlinks, traversal, remote buffers/textures, unsupported files and oversized bundles. It writes `public/models/sketchfab/<uid>/`, `attribution.json`, `credits.txt` and the public `index.json` credit manifest. Unknown metadata fields and signed download URLs are not copied.
- `ImportedStoreModel.jsx` is an opt-in R3F loader for these reviewed local assets. **No existing fixture, product or NPC is replaced automatically.** Codex must review model scale, geometry/license, collider fit, mobile cost and visible attribution before wiring a model into the store and publishing. Add a visible Model credits link to `/models/sketchfab/index.json` when the first imported asset is actually used. Existing products, controls and demo checkout restrictions remain unchanged.

## Security and operations

Admin session checks protect search/status/connect/disconnect/download. Mutations require same-origin requests. OAuth uses a random ten-minute, one-use state, a separate HttpOnly Secure SameSite=Lax callback cookie and a live admin-session binding. Password changes invalidate pending state. The admin cookie keeps SameSite=Strict. Callback URLs are validated against the current HTTPS site; tokens never enter URLs, localStorage or frontend responses.

D1 stores access tokens encrypted with AES-GCM and a server-only key. Expired authorization requires connecting again; refresh tokens are not retained in this first release. Rotating the encryption key requires reconnecting. **Disconnect** clears Lunova's local authorization and pending states; revoke the application's grant in Sketchfab's Connected apps settings to revoke it at the provider too. Do not log callback query strings or token-exchange bodies. Production access/authenticated downloads remain unverified until registration and consent are complete.

## Verified search and checks

A live official Data API search for **supermarket shelf**, `downloadable=true`, returned 12 results during this task. License lookups resolved those results to CC Attribution. Filter checks for `by`, `by-nc` and `cc0` returned matching license references (CC0 had no matching results at that time). Search results and download availability can change.

Examples (references only; no files downloaded):

- [psx supermarket shelf — Brainsick Games](https://sketchfab.com/3d-models/cbae12ae52e44d7f9828c410417b0e66)
- [Supermarket Drinks Shelf Asset — Rendevr](https://sketchfab.com/3d-models/4f22309bf38e4941a3ea2237ac886acb)

Repeat the live, unauthenticated search from Codex Cloud with:

```sh
NODE_USE_ENV_PROXY=1 npm run sketchfab:search -- 'supermarket shelf'
```

Tests use an actual local D1 database plus mocked upstream responses for OAuth/download denial, code exchange, encrypted storage, state expiry/replay/password rotation, admin gating, ZIP safety, resource limits, credit preservation and import behavior. Browser tests verify filters/credits, restricted download buttons, blocked external resources and a locally generated triangle GLB preview. These fixtures do not establish that your personal account is connected. Run `npm test`, `npm run build`, both Functions builds, and relevant Playwright tests; account activation is a separate live verification.

Official references: [Data API](https://sketchfab.com/developers/data-api/v3), [OAuth](https://sketchfab.com/developers/oauth), [Download API](https://sketchfab.com/developers/download-api). No external model-generation service was restored.

Validation completed: 38 unit/backend tests, three Sketchfab browser tests, the published-catalog browser test and three existing Admin browser tests passed. Production build and both Functions compilers passed. Live public search passed; no personal-account download was attempted.
