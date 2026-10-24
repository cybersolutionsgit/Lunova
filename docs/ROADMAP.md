# Lunova Secrets roadmap

## Complete — first prototype

A procedural 3D store, first-person/touch movement, bounded collision, product interaction, a searchable catalog, persistent demo bag and Cloudflare deployment preparation. The owner deployed it on Cloudflare Pages. Payments and real orders stay disabled.

## Current — lingerie boutique and local customization

- Replace grocery shelving with tall brass display rails, featured-image panels, stylized mannequins, fitting-room scenery and boutique colors.
- Collections for lingerie sets, bras, underwear, sleepwear and robes; original labelled samples until an actual catalog is imported.
- Device-local product editor: photos/uploads, names/descriptions, prices, demo limits, color, display slots and presentation.
- Public WooCommerce catalog importer with pagination, import preview, validated JSON import/export, and explicit CORS/error states. Read-only access; no changes to the live WordPress site.
- Test cart reconciliation after edits/removal, display collision, product selection, mobile controls and import failure handling.
- The supplied and live WooCommerce feeds matched 21 product IDs; the published snapshot includes PKR prices and locally copied featured images.
- **Limits:** this snapshot does not sync automatically; browser import still depends on source CORS. Local edits are not published to other visitors. Mannequins are stylized forms, not accurate garment models. At most 12 products are in 3D at once; all imported products are in the catalog.

## Next — owner-directed design and real catalog

Review the boutique style; import the real catalog and verify product names, currency, photos, stock messaging, collection assignment and display positions. Publish the reviewed seed catalog for all visitors. Replace/optimize licensed assets as needed. Check source image CORS and ownership, real mobile hardware, keyboard access and frame rate. No orders yet.

## Later — shared catalog and hosting

The owner prefers moving files/database to their own hosting later while keeping the current WordPress site. Evaluate existing WooCommerce installation and hosting capabilities before selecting the backend. Prefer one authoritative catalog instead of duplicating inventory. Supabase remains an alternative only if deliberately selected; do not introduce it by default.

Implement authenticated, server-authorized editing, safe media uploads and shared display positions. Server roles must control write operations; local demo editor behavior must not be presented as secure administration. Develop on staging before touching the running WordPress store.

## Later — checkout and customer accounts

Only after explicit owner approval: authenticated/guest checkout policy, sizes/variants, delivery region/currency, Cash on Delivery, server-side authoritative pricing/stock checks, atomic inventory updates, order history and secure administrator roles. Test unauthorized operations, concurrent purchases and retries. Respect the chosen backend's access policies, rate limits and credential handling. No secrets in browser code.

## Optional — real payments and realistic 3D garments

Require separate approval, account access and licensed assets. Payments use server-created sessions and verified webhooks. Accurate mannequin garments need suitable garment meshes, sizing and material work; do not claim a product photo alone produces a realistic 3D garment or fitting simulation.
