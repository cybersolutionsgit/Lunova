import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCart, setQuantity, cartTotals } from "../src/lib/cart.js";
import { canOccupy, movePlayer, aisleSpawns } from "../src/lib/world.js";
import { products, categories } from "../src/lib/products.js";
test("cart adds, clamps stock, removes and computes integer-cent totals", () => {
  let cart = setQuantity({}, "milk", 2);
  cart = setQuantity(cart, "bread", 1);
  assert.deepEqual(cartTotals(cart), { count: 3, subtotal: 930 });
  assert.equal(setQuantity(cart, "milk", 999).milk, 18);
  assert.equal(setQuantity(cart, "milk", -2).milk, undefined);
  assert.deepEqual(setQuantity(cart, "unknown", 4), cart);
});
test("saved carts reject corrupt or stale product data", () => {
  assert.deepEqual(
    sanitizeCart({ milk: 3, avocado: 999, unknown: 1, bread: 2.5, water: -1 }),
    { milk: 3, avocado: 12 },
  );
  assert.deepEqual(sanitizeCart(null), {});
  assert.deepEqual(sanitizeCart([]), {});
  assert.deepEqual(sanitizeCart({ milk: "2" }), {});
});
test("shelves and boundaries block movement, including long steps", () => {
  assert.equal(canOccupy(0, -2), false);
  assert.equal(canOccupy(0, 9), true);
  assert.equal(canOccupy(10, 9), false);
  const p = movePlayer({ x: 0, z: 9 }, 0, -15);
  assert.ok(p.z > 1.8);
  assert.ok(canOccupy(p.x, p.z));
  const side = movePlayer({ x: 2.5, z: 9 }, 0, -15);
  assert.ok(side.z < 0);
});
test("diagonal movement slides along shelf edges", () => {
  const p = movePlayer({ x: 1.4, z: 0 }, -0.6, -1);
  assert.ok(p.x > 1.2);
  assert.ok(p.z < 0);
  assert.ok(canOccupy(p.x, p.z));
});
test("all aisle destinations are collision-free and product IDs/categories are valid", () => {
  for (const [x, , z] of Object.values(aisleSpawns)) assert.ok(canOccupy(x, z));
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  for (const p of products) {
    assert.ok(categories.some((c) => c.id === p.category));
    assert.ok(p.stock > 0 && p.price > 0);
  }
});
