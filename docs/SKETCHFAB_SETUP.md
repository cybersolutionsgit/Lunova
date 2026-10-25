# Sketchfab is a development tool, not a store feature

The owner wants Codex to source realistic, licensed 3D assets and integrate them while building the store. Do not add Sketchfab search, connection buttons, rights management, model uploads or asset-library features to Admin or customer screens. The unpublished Admin integration and website OAuth endpoints were removed at the owner's direction. Nothing from that integration was deployed.

## Workflow owned by Codex

1. Search the official public Data API for suitable women, trolleys, garment racks, counters and shelves. Check visual fit, model complexity, animation/rig availability and licenses. Prefer CC0 or CC BY; CC BY-SA requires preserving its model-derivative license. Do not import noncommercial, NoDerivatives, editorial, restricted or unknown-license assets through this workflow.
2. Show the owner a short selection only when a meaningful design decision is needed. Search and asset integration are development tasks, not CMS responsibilities.
3. Download only when the official API allows it and the required account authorization exists. Never scrape the viewer or bypass authentication. If a protected download needs owner authorization, request only that specific account step through a secure flow. Do not ask for passwords or tokens in chat, build new Admin controls, or require account registration merely for public searching.
4. Keep the official model ID, creator/profile URL, source URL, complete license link and original download/attribution metadata with every asset. Use a metadata record containing `downloadAuthorization: "official-download-api"` only when it actually came from an authorized official download; do not manufacture authorization evidence to satisfy the importer.
5. Import the authorized archive and credits into the repository with the developer tool below. Review scale, geometry/texture cost, animation, fixture footprint/collisions and visible attribution. Integrate into the appropriate store component, test mobile/desktop and publish only with the owner's authorization. Existing product photos and shop functionality must remain intact.

## Existing developer tools

```sh
# Public search; no Sketchfab account credentials required.
NODE_USE_ENV_PROXY=1 npm run sketchfab:search -- 'supermarket shelf'

# Stage a legitimately authorized archive and its creator/rights metadata.
npm run models:import -- /path/to/official-archive.zip /path/to/creator-credits.json
```

Search resolves short license IDs against the official `/v3/licenses` catalog rather than guessing a license from its label. Keyword, license and download-availability validation lives in `src/lib/sketchfab.js`. Live public search for **supermarket shelf** returned 12 results; BY, BY-NC and CC0 filter behavior was checked. No actual model file has been downloaded or imported yet.

The importer supports ZIP archives, GLB files and extracted glTF folders. Python 3 is used only for ZIP extraction. It blocks symlinks, path traversal, remote resources, unsupported file types, duplicate IDs and oversized bundles. Limits: 25 MB total resources, 100 files and 500,000 mesh vertices. The first workflow requires uncompressed GLB/glTF for Draco/Meshopt/KTX2 assets.

Imported resources go to `public/models/sketchfab/<uid>/`, with `attribution.json`, `credits.txt` and a public `index.json` credit manifest. Signed archive URLs and unknown metadata fields are not published. `ImportedStoreModel.jsx` is an opt-in local R3F loader for reviewed assets; it does not automatically replace any fixture, product or NPC. When the first model is actually used, add a visible credits link in existing store Help, without adding a new management panel.

## Account configuration, only when needed

Official [Download API](https://sketchfab.com/developers/download-api) requests require user authentication. The [OAuth instructions](https://sketchfab.com/developers/oauth#registering-your-app) currently direct application registration through Sketchfab's contact team. Developer OAuth preparation remains documented here as an external prerequisite; no website callback route or account connection feature is installed.

The Codex Cloud configuration draft preserves the previous allowlist and adds `sketchfab.com`, `api.sketchfab.com` and `media.sketchfab.com`. It also contains optional client-ID, callback and client-secret requirements from the earlier preparation. These do not connect an account and are not needed for public search. No secret value has been supplied or exposed. Review/save/publish environment changes only when required. Do not configure Cloudflare runtime Sketchfab credentials or databases for this build-only workflow.

If a future developer authorization helper is necessary, use official Authorization Code OAuth, one-use expiring state, a correctly registered developer callback and privately stored credentials. Codex proxy-backed secrets are destination-bound and may be placeholders; never treat them as raw encryption keys or print their values. An earlier proposed production callback `/api/sketchfab/callback` is no longer implemented; do not register it without a new explicit development-auth design. No personal-account authenticated download is verified.

Official references: [Data API](https://sketchfab.com/developers/data-api/v3), [OAuth](https://sketchfab.com/developers/oauth), [Download API](https://sketchfab.com/developers/download-api).
