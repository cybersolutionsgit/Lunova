# Lunova Market

A fresh way to shop: a browser-based, walkable 3D supermarket. **Phase 1 is a prototype.** All products, stock and prices are samples (USD). No payments, real orders, customer accounts or backend are enabled.

## What is built

- Procedural 3D supermarket with three shelves, store signs, lighting, floor, walls and plants; 10 sample products across produce, dairy, bakery, pantry and drinks.
- First-person WASD/arrow movement, mouse drag, optional pointer lock, touch arrow pad, shelf/wall collision and aisle shortcuts.
- Clickable shelf products and detail dialogs; persistent device-local demo bag with stock limits, quantity changes and removal.
- Searchable product view for browsing without 3D, graphics settings and mobile layout.

## Run locally or in Codex Cloud

Use Node.js 22 or later and npm. From the existing checkout (cloud tasks are already isolated; no worktree needed):

```sh
cd /workspace/Lunova
npm ci
npm run dev -- --port 5173 --strictPort
```

On your own computer, use your checkout path instead. Vite prints the development address. In Codex Cloud, validate with internal HTTP requests and browser tests; onboarding does not provide a public localhost preview. No environment variables, Supabase project or credentials are required for Phase 1. Files, fonts and 3D packaging are generated locally; the app makes no external API requests. The bag is stored in this browser's local storage under `lunova-demo-cart-v1`.

### Controls

- **Walk:** W/A/S/D or arrow keys. Touch devices: on-screen arrow pad.
- **Look:** drag across the scene. Optional “Enter walk mode” captures the mouse; Esc releases it.
- **Inspect:** click a product. In pointer-lock mode, the center dot is the aim point.
- **Jump to an aisle:** desktop sidebar or the three inspiration cards.
- **Reset:** curved arrow in the bottom-right of the scene returns to the entrance.
- **Older device:** Settings → Lightweight. For no 3D, use Product view.

### Checks

```sh
npm test
npm run build
npm run test:e2e
```

Unit tests cover cart mutation/hydration, stock limits, cent-based totals, shelf collision, sliding and safe aisle destinations. Playwright starts its own Vite server and checks browser rendering, product interactions, persistence, search and mobile layout. It uses `/usr/bin/chromium` when available. To use another existing browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable. Otherwise install Chromium once:

```sh
npx playwright install chromium
```

The browser tests use software WebGL flags in headless Linux. CI installs Chromium and OS dependencies with `npx playwright install --with-deps chromium`. A WebGL-capable browser is needed for the 3D scene; the catalog remains available if graphics fail. Hardware/mobile device testing is still required before production release.

## Cloudflare Pages (owner setup, not deployed yet)

1. Once this code is on GitHub, open **Cloudflare → Workers & Pages → Create application → Pages → Connect to Git**.
2. Authorize GitHub and select **cybersolutionsgit/Lunova**.
3. Select your approved production branch (normally `main`, after it exists). Choose **Vite**, build command **`npm run build`**, output directory **`dist`**, root directory **`/`**. Set **`NODE_VERSION` to `22`**. No other variables are needed for the demo.
4. Review and select **Save and Deploy** when you want to publish. This task does not authorize deployment automatically.
5. In GitHub **Settings → Rules → Rulesets**, protect the production branch: require a pull request and the **checks** CI job before merging; disable direct pushes where your plan supports it. Turn on Cloudflare preview deployments for feature branches if desired.

Cloudflare's Git integration automatically rebuilds after an approved PR is merged into the configured production branch. GitHub/Cloudflare accounts, repository authorization and production deployment approval are owner actions. No API tokens are needed in this source tree. `public/_headers` provides conservative browser security headers, including a same-origin resource policy for this local-asset prototype. Revisit those rules when external APIs/assets are intentionally added.

## Planned backend configuration — not required yet

[Development roadmap](docs/ROADMAP.md) describes accounts, Supabase RLS, secure server-side checkout, inventory and admin phases. Do not configure fake keys. In Phase 2 the public client config will use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; those are public client settings. Supabase secret/service-role keys belong only in trusted server environments, never VITE_* variables. Before accepting real orders, implement authenticated server-side price and inventory validation, atomic stock changes, order ownership policies and secure admin authorization, and obtain explicit owner approval.

## Repository guide

See [AGENTS.md](AGENTS.md) for architecture and conventions for future Codex sessions. [docs/ROADMAP.md](docs/ROADMAP.md) contains milestones and acceptance criteria. React + Vite + JavaScript, Three.js / React Three Fiber, Tailwind CSS and Zustand are used. Drei is available for future 3D helpers; Supabase integration is intentionally deferred until Phase 2.

## Known prototype limits

Procedural low-poly graphics, simplified axis-aligned collision and sample data; no physics interactions or photo-realistic models. Graphics settings reset when the app reloads. No delivery/taxes, live inventory, order processing, accounts, admin or analytics. Software-rendered tests establish browser functionality, not real-device frame rates. Public launch needs device/accessibility/security review and the later roadmap phases.
