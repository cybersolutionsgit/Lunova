import { productById, products, currencyScale } from "./products.js";
export function sanitizeCart(items, catalog = products) {
  if (!items || typeof items !== "object" || Array.isArray(items)) return {};
  return Object.fromEntries(
    Object.entries(items)
      .filter(
        ([id, q]) =>
          productById(id, catalog) &&
          Number.isInteger(q) &&
          q > 0 &&
          productById(id, catalog).stock > 0,
      )
      .map(([id, q]) => [id, Math.min(q, productById(id, catalog).stock)]),
  );
}
export function setQuantity(items, id, quantity, catalog = products) {
  const p = productById(id, catalog);
  if (!p || !Number.isFinite(quantity)) return sanitizeCart(items, catalog);
  const next = { ...sanitizeCart(items, catalog) };
  const q = Math.max(0, Math.min(p.stock, Math.floor(quantity)));
  if (q) next[id] = q;
  else delete next[id];
  return next;
}
export function cartTotals(items, catalog = products, currency = "USD") {
  const scale = currencyScale(currency);
  return Object.entries(sanitizeCart(items, catalog)).reduce(
    (t, [id, q]) => ({
      count: t.count + q,
      subtotal:
        t.subtotal + Math.round(productById(id, catalog).price * scale) * q,
    }),
    { count: 0, subtotal: 0 },
  );
}

export function hydrateCart(items) {
  if (!items || typeof items !== "object" || Array.isArray(items)) return {};
  return Object.fromEntries(
    Object.entries(items)
      .slice(0, 500)
      .filter(
        ([id, q]) =>
          /^[a-zA-Z0-9_-]{1,80}$/.test(id) &&
          Number.isInteger(q) &&
          q > 0 &&
          q <= 9999,
      ),
  );
}
