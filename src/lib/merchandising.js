export const FIXTURE_COUNT = 12;
export const POSITIONS_PER_FIXTURE = 3;
// Preserve old anchor placements, then bring old capacity-overflow items onto
// the new positions. Once upgraded, explicit catalog-only choices stay put.
export function upgradeLayout(catalog) {
  if (catalog.layoutVersion === 2) return catalog;
  const products = catalog.products.map((p) =>
    p && typeof p === "object" ? { ...p, displaySlot: 0 } : p,
  );
  const used = new Set(
    products.filter((p) => p?.display !== null).map((p) => `${p?.display}:0`),
  );
  for (const product of products) {
    if (!product || product.display !== null) continue;
    let placed = false;
    for (let slot = 0; slot < POSITIONS_PER_FIXTURE && !placed; slot++)
      for (let display = 0; display < FIXTURE_COUNT; display++) {
        if (!used.has(`${display}:${slot}`)) {
          product.display = display;
          product.displaySlot = slot;
          used.add(`${display}:${slot}`);
          placed = true;
          break;
        }
      }
  }
  return { ...catalog, layoutVersion: 2, products };
}
export function groupedProducts(products) {
  return Array.from({ length: FIXTURE_COUNT }, (_, i) =>
    products
      .filter((p) => p.display === i)
      .sort((a, b) => (a.displaySlot ?? 0) - (b.displaySlot ?? 0)),
  );
}
export function productPlacement(type, slot = 0) {
  const x = [0, -0.7, 0.7][slot];
  if (type === "shoes") {
    const y = [1.25, 0.55, 1.95][slot];
    return {
      prop: [-0.27, y + 0.06, 0],
      photo: [0.76, y + 0.26, 0.52],
      width: 0.42,
    };
  }
  if (type === "mart") {
    const y = [1.22, 0.55, 1.89][slot];
    return {
      prop: [-0.35, y + 0.2, 0],
      photo: [0.76, y + 0.22, 0.53],
      width: 0.4,
    };
  }
  if (type === "boutique")
    return { prop: [x, 1.75, 0], photo: [x, 1.25, 0.58], width: 0.54 };
  if (["bakery", "beauty", "jewelry"].includes(type))
    return { prop: [x, 1.16, 0], photo: [x, 0.62, 0.58], width: 0.5 };
  return { prop: [x, 0.95, 0], photo: [x, 1.85, 0.55], width: 0.5 };
}
