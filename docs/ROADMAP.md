# Lunova development roadmap

The goal is a walkable virtual supermarket, manageable through natural-language requests. Build incrementally; keep the prototype usable between phases. Free tiers and open-source tools are the default. Account limits and third-party terms must be checked before deployment.

## Phase 1 — Playable local prototype (current)

- React + Vite + JavaScript, React Three Fiber / Three.js, Tailwind, Zustand.
- Original procedural store: walls, tiled floor, lighting, three shelving units, plants, signage, and ten sample products organized into five departments.
- First-person WASD / arrow keys, drag or pointer-lock mouse look, touch movement, shelf and boundary collision, aisle shortcuts, entrance reset.
- Click shelf products, inspect details, add to a persistent sample shopping bag, adjust quantities and remove items. Alternative searchable 2D product view.
- Responsive interface, lightweight graphics option, modal keyboard navigation, and graceful 3D failure message.
- Unit tests, browser smoke tests, build checks, documented setup, Cloudflare Pages deployment instructions.
- **Exit:** tested movement/collision, rendered 3D scene, working product interaction and saved demo bag. No checkout, accounts, personal data collection, or real orders.

## Phase 2 — Product data and accounts

- Connect a user-owned Supabase project using its public URL and publishable key.
- Versioned migrations for products, categories, inventory, shelf positions, profiles, and administrator memberships.
- Supabase Auth sign-up / sign-in / sign-out, password reset, session recovery; validated inputs and accessible error states.
- RLS on every exposed table; shoppers see only permitted public product data and their own profile. Administrator membership must never be writable by shoppers.
- Retain explicit demo mode, decide data ownership and policies, test access as anonymous, customer, and administrator.
- **Requires owner:** Supabase account/project, secure environment settings, permitted auth URLs.

## Phase 3 — Secure ordering and admin

- Server-side authenticated checkout via a Supabase database function or Edge Function; derive prices from database, validate stock, atomically reserve inventory, prevent duplicate submissions, and store immutable order item prices.
- Cash on Delivery only, enabled only after owner approval. Never trust client prices, quantities, order totals, roles, or status transitions.
- Customer order history isolated by RLS; admin product CRUD, inventory, shelf placement, and order status changes with server authorization.
- Test concurrent purchases, unauthorized requests, sold-out products, retries, and order ownership.
- **Requires owner:** real product/inventory data, delivery region/currency, legal/privacy requirements, explicit authorization to accept real orders.

## Phase 4 — Production deployment and polish

- Cloudflare Pages Git integration, preview builds, protected production branch, required CI, owner-reviewed changes.
- Device testing, performance budgets, texture/model compression where assets are introduced, accessibility review, observability, rate limits, recovery and backups.
- Choose any third-party models with documented redistribution licenses. Keep a 2D fallback.
- **Requires owner:** Cloudflare/GitHub authorization, production branch selection, domain configuration and production approval.

## Later — Optional online payments

Choose a gateway only when requested. Use server-created payment sessions, signature-verified webhooks, idempotency, and no card data handled by this app. Requires separate explicit approval and credentials; never enable during the prototype.
