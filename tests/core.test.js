import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeCart as sanitize,
  setQuantity as quantity,
  cartTotals as totals,
} from "../src/lib/cart.js";
import {
  canOccupy,
  movePlayer,
  aisleSpawns,
  displays,
} from "../src/lib/world.js";
import {
  categories,
  defaultCatalog as publishedCatalog,
  sampleCatalog as defaultCatalog,
} from "../src/lib/products.js";
const products = defaultCatalog.products;
const sanitizeCart = (items, catalog = products) => sanitize(items, catalog);
const setQuantity = (items, id, q, catalog = products) =>
  quantity(items, id, q, catalog);
const cartTotals = (items, catalog = products, currency = "USD") =>
  totals(items, catalog, currency);
import {
  validateCatalog,
  fromWooCommerce,
  safeImage,
  safeLink,
  plainText,
  fetchPublicCatalog,
} from "../src/lib/catalog.js";
test("cart adds, clamps, removes and computes integer-cent totals", () => {
  let c = setQuantity({}, "lace-set", 2);
  c = setQuantity(c, "soft-bralette", 1);
  assert.deepEqual(cartTotals(c), { count: 3, subtotal: 12400 });
  assert.equal(setQuantity(c, "lace-set", 99)["lace-set"], 10);
  assert.equal(setQuantity(c, "lace-set", -1)["lace-set"], undefined);
  assert.deepEqual(setQuantity(c, "unknown", 4), c);
});
test("saved carts reject corrupt and removed data, and respect edited inventory", () => {
  assert.deepEqual(
    sanitizeCart({ "lace-set": 99, unknown: 2, "soft-bralette": 2.5 }),
    { "lace-set": 10 },
  );
  assert.deepEqual(sanitizeCart(null), {});
  assert.deepEqual(sanitizeCart([]), {});
  const edited = [{ ...products[0], stock: 0 }];
  assert.deepEqual(sanitizeCart({ "lace-set": 2 }, edited), {});
  assert.deepEqual(setQuantity({}, "lace-set", 2, edited), {});
  assert.deepEqual(
    cartTotals({ "lace-set": 2 }, [{ ...products[0], price: 1.25 }]),
    { count: 2, subtotal: 250 },
  );
});
test("fixture collision stops movement including long steps", () => {
  assert.equal(canOccupy(0, 3), false);
  assert.equal(canOccupy(0, 9), true);
  assert.equal(canOccupy(10, 9), false);
  const p = movePlayer({ x: 0, z: 9 }, 0, -20);
  assert.ok(p.z >= 3.97);
  assert.ok(canOccupy(p.x, p.z));
  const side = movePlayer({ x: 2.5, z: 9 }, 0, -15);
  assert.ok(side.z < 0);
});
test("diagonal movement slides along fixtures and all collection destinations are safe", () => {
  const p = movePlayer({ x: 1.7, z: 3 }, -0.8, -1);
  assert.ok(p.x > 1.5);
  assert.ok(p.z < 3);
  assert.ok(canOccupy(p.x, p.z));
  for (const [x, , z] of Object.values(aisleSpawns)) assert.ok(canOccupy(x, z));
  assert.equal(displays.length, 12);
});
test("seed products form a valid catalog and unique slots", () => {
  assert.deepEqual(validateCatalog(defaultCatalog), defaultCatalog);
  for (const p of products)
    assert.ok(categories.some((c) => c.id === p.category));
});
test("invalid product edits and unsafe image/link protocols are rejected", () => {
  assert.equal(safeImage("javascript:alert(1)"), "");
  assert.equal(safeImage("http://example.com/a.jpg"), "");
  assert.equal(safeImage("//example.com/a.jpg"), "");
  assert.equal(safeImage("https://user:password@example.com/a.jpg"), "");
  assert.equal(safeLink("javascript:alert(1)"), "");
  assert.equal(safeImage("/products/sets.svg"), "/products/sets.svg");
  for (const edit of [
    { price: -1 },
    { stock: 2.5 },
    { display: 99 },
    { image: "javascript:alert(1)" },
    { category: "unknown" },
  ])
    assert.throws(() =>
      validateCatalog({
        ...defaultCatalog,
        products: [{ ...products[0], ...edit }],
      }),
    );
  assert.throws(
    () =>
      validateCatalog({
        ...defaultCatalog,
        products: [products[0], { ...products[1], display: 0 }],
      }),
    /same display/,
  );
  assert.throws(
    () =>
      validateCatalog({
        ...defaultCatalog,
        products: [products[0], products[0]],
      }),
    /unique/,
  );
});
const woo = (id = 10) => ({
  id,
  name: "Rose &amp; lace set",
  short_description: "<p>Soft <strong>lace</strong>.</p>",
  prices: { price: "350000", currency_code: "PKR", currency_minor_unit: 2 },
  categories: [{ name: "Lingerie sets" }],
  images: [{ src: "https://lunovasecrets.com/wp-content/uploads/set.jpg" }],
  is_in_stock: true,
  permalink: "https://lunovasecrets.com/product/rose-set/",
});
test("WooCommerce import uses featured photos, currency and integer minor-unit prices", () => {
  const c = fromWooCommerce([woo()]);
  assert.equal(c.currency, "PKR");
  assert.equal(c.source, "woocommerce");
  assert.equal(c.products[0].price, 3500);
  assert.equal(c.products[0].name, "Rose & lace set");
  assert.equal(c.products[0].image, woo().images[0].src);
  assert.equal(c.products[0].stock, 10);
  assert.equal(c.products[0].description, "Soft lace .");
  assert.equal(plainText("&#x2764; &quot;Lace&quot;"), '❤ "Lace"');
});
test("imports preserve catalog-only overflow and sold-out state without claiming live stock", () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({
    ...woo(i + 1),
    is_in_stock: i !== 0,
  }));
  const c = fromWooCommerce(rows);
  assert.equal(c.products.length, 15);
  assert.equal(c.products[0].stock, 0);
  assert.equal(c.products[11].display, 11);
  assert.equal(c.products[12].display, null);
  assert.throws(() => fromWooCommerce([]));
  assert.throws(() =>
    fromWooCommerce([{ ...woo(), prices: { ...woo().prices, price: "" } }]),
  );
  assert.throws(
    () =>
      fromWooCommerce([
        woo(),
        { ...woo(11), prices: { ...woo().prices, currency_code: "USD" } },
      ]),
    /currency/,
  );
});
test("public catalog importer retrieves paginated products without credentials", async () => {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify([woo(calls.length)]), {
      headers: { "X-WP-TotalPages": "2", "Content-Type": "application/json" },
    });
  };
  try {
    const c = await fetchPublicCatalog();
    assert.equal(c.products.length, 2);
    assert.ok(calls[1].url.endsWith("page=2"));
    assert.equal(calls[0].options.credentials, "omit");
  } finally {
    global.fetch = original;
  }
});
test("catalog prices and demo totals respect currency decimal precision", () => {
  const input = {
    ...woo(),
    prices: { price: "12345", currency_code: "BHD", currency_minor_unit: 3 },
  };
  const catalog = fromWooCommerce([input]);
  assert.equal(catalog.products[0].price, 12.345);
  assert.equal(
    cartTotals({ "woo-10": 2 }, catalog.products, catalog.currency).subtotal,
    24690,
  );
  const yen = fromWooCommerce([
    {
      ...woo(),
      prices: { price: "12345", currency_code: "JPY", currency_minor_unit: 0 },
    },
  ]);
  assert.equal(
    cartTotals({ "woo-10": 2 }, yen.products, yen.currency).subtotal,
    24690,
  );
});

test("published catalog uses the supplied 21 real PKR products and featured image URLs", () => {
  assert.equal(publishedCatalog.products.length, 21);
  assert.equal(publishedCatalog.currency, "PKR");
  assert.equal(publishedCatalog.source, "woocommerce");
  assert.deepEqual(validateCatalog(publishedCatalog), publishedCatalog);
  for (const p of publishedCatalog.products) {
    assert.ok(p.id.startsWith("woo-"));
    assert.ok(p.image.startsWith("/products/catalog/"));
    assert.ok(p.originalImage.startsWith("https://lunovasecrets.com/"));
    assert.ok(p.sourceUrl.startsWith("https://lunovasecrets.com/"));
  }
  assert.equal(
    publishedCatalog.products.filter((p) => p.display !== null).length,
    12,
  );
});
test("new store categories and settings validate without silently deleting old collections", async () => {
  const {
    STORE_TYPES,
    defaultSettings,
    validateSettings,
    getCollections,
    contrastColor,
  } = await import("../src/lib/shop.js");
  assert.equal(Object.keys(STORE_TYPES).length, 9);
  for (const type of Object.keys(STORE_TYPES)) {
    assert.equal(validateSettings({ ...defaultSettings, type }).type, type);
    assert.ok(getCollections(type, products).some((c) => c.id === "sets"));
  }
  assert.throws(() =>
    validateSettings({ ...defaultSettings, type: "unknown" }),
  );
  assert.throws(() =>
    validateSettings({
      ...defaultSettings,
      theme: { ...defaultSettings.theme, primary: "javascript:bad" },
    }),
  );
  assert.equal(contrastColor("#ffffff"), "#281f27");
  assert.equal(contrastColor("#000000"), "#ffffff");
});
test("cart hydration defers unknown product pruning until the shared catalog loads", async () => {
  const { hydrateCart } = await import("../src/lib/cart.js");
  assert.deepEqual(
    hydrateCart({
      "new-shared-product": 2,
      bad: "3",
      negative: -1,
      huge: 10000,
    }),
    { "new-shared-product": 2 },
  );
  assert.deepEqual(hydrateCart(null), {});
});

test("photo-only catalogs discard retired asset fields while preserving product details", () => {
  const product = publishedCatalog.products[0];
  const result = validateCatalog({
    ...publishedCatalog,
    products: [
      {
        ...product,
        presentation: "mannequin",
        modelUrl: "/api/models/" + "a".repeat(64) + ".glb",
        modelImageHash: "b".repeat(64),
        autoModel: true,
      },
    ],
  });
  const clean = result.products[0];
  assert.equal(clean.presentation, "photo");
  for (const key of ["modelUrl", "modelImageHash", "autoModel"])
    assert.equal(Object.hasOwn(clean, key), false);
  assert.equal(clean.image, product.image);
  assert.equal(clean.name, product.name);
  assert.equal(clean.price, product.price);
});
