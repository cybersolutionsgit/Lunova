# Lunova roadmap

## Complete — immersive customer prototype

A viewport-filling 3D store, mouse-hover camera look, WASD/touch walking, collision detection, collapsible sidebar and in-environment/fullscreen popups. Twenty-one owner-supplied WooCommerce products with PKR prices and local featured photos. The original customer prototype is deployed on Cloudflare; the owner connected shop.lunovasecrets.com. Demo bag only: no signup, checkout, payments or orders.

## Current — protected shared CMS

Customer Customize controls are removed. Sidebar Admin opens server-checked username/password login with no signup. Pages Functions + D1 provide shared catalog/settings publishing. Nine niche fixtures and collections are implemented: clothing rails with individual photo tags, shoes, bakery counters, supermarket shelves, beauty, jewelry, electronics, furniture and general store. Edit details, logo, theme, products, display slots and demo quantity limits. Changing niche preserves products. Decorative models are not exact SKU models.

Local D1 authorization tests, browser UI checks and a combined local Pages/D1 integration are verified. Production database creation, migration, DB binding and the ADMIN_PASSWORD server secret require the owner's Cloudflare account. Finish CMS_SETUP.md, review/merge, deploy, and verify live as admin and in a separate customer session. Do not call production CMS active until that succeeds.

## Next — owner-directed polish and richer merchandising

Review niche fixtures with the owner, improve licensed/optimized 3D assets and mobile performance, add category editing or more display capacity if requested. Keep the featured photo as the authoritative visual. Treat WooCommerce imports as snapshots unless a deliberate sync integration is implemented.

## Later — hosting migration and authoritative commerce

The owner prefers moving files/database to existing hosting later while retaining WordPress at lunovasecrets.com. Export the catalog and SQLite-compatible D1 data; migrate or replace the API as well as the frontend. Evaluate WordPress/WooCommerce capabilities before creating another authoritative inventory system. Preserve website/email DNS and test on staging.

Only after explicit owner approval: sizes/variants, real stock management, authenticated/guest checkout policy, delivery region, Cash on Delivery, server-authoritative pricing, atomic inventory updates, order history, status management and administrator authorization. Test concurrency, retries and unauthorized access. Admin CMS login does not imply customer accounts or order processing are enabled.

## Optional — payments

Separate approval and account access required. Use server-created payment sessions, signature-verified webhooks and idempotency. Never store card data or expose secret keys in frontend configuration.

## Current — multiple products and tailored fixtures

External model generation and body/mannequin forms remain removed. Each of twelve fixtures now supports three independently selectable products. Clothing rails, detailed shoe racks, glazed bakery counters and other niche props retain original featured-photo tags. A hand-carried basket tracks the demo cart. NPC shoppers/cashiers are a future optional feature; keep counts bounded and mobile performance configurable.
