import { productById } from "./products.js";
export function sanitizeCart(items) {
  if (!items || typeof items !== "object" || Array.isArray(items)) return {};
  return Object.fromEntries(
    Object.entries(items)
      .filter(([id, q]) => productById(id) && Number.isInteger(q) && q > 0)
      .map(([id, q]) => [id, Math.min(q, productById(id).stock)]),
  );
}
export function setQuantity(items, id, quantity) {
  const p = productById(id);
  if (!p || !Number.isFinite(quantity)) return sanitizeCart(items);
  const next = { ...sanitizeCart(items) };
  const q = Math.max(0, Math.min(p.stock, Math.floor(quantity)));
  if (q) next[id] = q;
  else delete next[id];
  return next;
}
export function cartTotals(items) {
  return Object.entries(sanitizeCart(items)).reduce(
    (total, [id, q]) => ({
      count: total.count + q,
      subtotal: total.subtotal + Math.round(productById(id).price * 100) * q,
    }),
    { count: 0, subtotal: 0 },
  );
}
