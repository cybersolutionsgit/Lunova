import { currencyScale } from "./products.js";
import { allCategories as categories } from "./shop.js";
export const CATALOG_KEY = "lunova-boutique-catalog-v1";
export const MAX_PRODUCTS = 500;
export const MAX_CATALOG_CHARS = 1500000;
export function safeImage(value) {
  if (typeof value !== "string" || value.length > 900000) return "";
  if (/^\/(?!\/)[^\\\s]*$/.test(value)) return value;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value))
    return value;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function safeLink(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function plainText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const c =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
const fail = (message) => {
  throw new Error(message);
};
export function validateCatalog(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.products))
    fail("Choose a Lunova catalog JSON file (version 1).");
  if (input.products.length > MAX_PRODUCTS)
    fail(`Use a maximum of ${MAX_PRODUCTS} products.`);
  const currency = String(input.currency || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    fail("Currency must be a three-letter code.");
  try {
    new Intl.NumberFormat("en", { style: "currency", currency }).format(0);
  } catch {
    fail("Invalid currency code.");
  }
  const scale = currencyScale(currency);
  const ids = new Set(),
    slots = new Set();
  const products = input.products.map((p, i) => {
    if (!p || typeof p !== "object") fail(`Product ${i + 1} is invalid.`);
    const id = String(p.id || "");
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id))
      fail("Every product needs a unique, valid ID.");
    ids.add(id);
    const name = plainText(p.name).slice(0, 120);
    if (!name) fail("Every product needs a name.");
    if (!categories.some((c) => c.id === p.category && c.id !== "all"))
      fail(`Choose a collection for ${name}.`);
    if (
      typeof p.price !== "number" ||
      !Number.isFinite(p.price) ||
      p.price < 0 ||
      p.price > 10000000
    )
      fail(`Enter a valid price for ${name}.`);
    if (!Number.isInteger(p.stock) || p.stock < 0 || p.stock > 9999)
      fail(`Enter a demo quantity limit from 0 to 9999 for ${name}.`);
    if (
      p.display !== null &&
      (!Number.isInteger(p.display) || p.display < 0 || p.display > 11)
    )
      fail(`Choose a display from 1 to 12 for ${name}.`);
    if (p.display !== null) {
      if (slots.has(p.display))
        fail(
          "Two products cannot use the same display. Choose another display or catalog only.",
        );
      slots.add(p.display);
    }
    const image = safeImage(p.image);
    if (!image) fail(`Use an HTTPS image URL or upload a photo for ${name}.`);
    return {
      id,
      name,
      category: p.category,
      price: Math.round(p.price * scale) / scale,
      unit: plainText(p.unit).slice(0, 100),
      description: plainText(p.description).slice(0, 2000),
      color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#8b5263",
      image,
      ...(p.originalImage ? { originalImage: safeImage(p.originalImage) } : {}),
      stock: p.stock,
      display: p.display,
      presentation: "photo",
      tag: plainText(p.tag).slice(0, 40),
      sourceUrl: safeLink(p.sourceUrl),
    };
  });
  const result = {
    version: 1,
    currency,
    source:
      input.source === "woocommerce"
        ? "woocommerce"
        : input.source === "custom"
          ? "custom"
          : "sample",
    products,
  };
  if (JSON.stringify(result).length > MAX_CATALOG_CHARS)
    fail(
      "This catalog is too large for the shared store. Use image URLs or smaller photos.",
    );
  return result;
}
export function guessCategory(product) {
  const text = [product.name, ...(product.categories || []).map((c) => c.name)]
    .join(" ")
    .toLowerCase();
  if (/robe|kimono|lounge/.test(text)) return "robes";
  if (/sleep|night|pajama|pyjama|slip|chemise|babydoll/.test(text))
    return "sleepwear";
  if (/set|bodysuit|teddy/.test(text)) return "sets";
  if (/gown/.test(text)) return "sleepwear";
  if (/pant|brief|thong|underwear/.test(text)) return "underwear";
  if (/bra|bralette|corset/.test(text)) return "bras";
  return "sets";
}
export function fromWooCommerce(rows) {
  if (!Array.isArray(rows) || !rows.length)
    fail("No public WooCommerce products were found.");
  const currencies = new Set(rows.map((p) => p.prices?.currency_code));
  if (currencies.size !== 1 || !rows[0].prices?.currency_code)
    fail("Products must have one consistent store currency.");
  const products = rows.map((p, i) => {
    if (!Number.isInteger(p.id) || p.id < 1)
      fail("Every website product needs a valid WooCommerce ID.");
    const raw = p.prices?.price,
      minor = p.prices?.currency_minor_unit;
    if (
      typeof raw !== "string" ||
      !/^\d+$/.test(raw) ||
      !Number.isInteger(minor) ||
      minor < 0 ||
      minor > 4
    )
      fail(`A valid public price is missing for ${plainText(p.name)}.`);
    const category = guessCategory(p),
      image = safeImage(p.images?.[0]?.src) || `/products/${category}.svg`;
    return {
      id: `woo-${p.id}`,
      name: plainText(p.name),
      category,
      price: Number(raw) / 10 ** minor,
      unit:
        p.type === "variable"
          ? "Sizes and options on main website"
          : "Imported product · demo bag only",
      description: plainText(p.short_description || p.description),
      color: "#8b5263",
      image,
      ...(p.originalImage ? { originalImage: safeImage(p.originalImage) } : {}),
      stock: p.is_in_stock === false ? 0 : 10,
      display: i < 12 ? i : null,
      presentation: "photo",
      tag: "FROM YOUR WEBSITE",
      sourceUrl: p.permalink,
    };
  });
  return validateCatalog({
    version: 1,
    currency: rows[0].prices.currency_code,
    source: "woocommerce",
    products,
  });
}
export async function fetchPublicCatalog({ signal } = {}) {
  const rows = [];
  let total = 1;
  for (let page = 1; page <= total; page++) {
    const response = await fetch(
      `https://lunovasecrets.com/wp-json/wc/store/v1/products?per_page=100&page=${page}`,
      { signal, credentials: "omit" },
    );
    if (!response.ok)
      fail(
        `Website import returned ${response.status}. Export the public product JSON and use Import file instead.`,
      );
    const batch = await response.json();
    if (!Array.isArray(batch))
      fail("Your website did not return a public product list.");
    if (page === 1) {
      const pages = Number(response.headers.get("X-WP-TotalPages"));
      total =
        Number.isInteger(pages) && pages > 0
          ? pages
          : batch.length === 100
            ? 2
            : 1;
    }
    if (
      !response.headers.get("X-WP-TotalPages") &&
      batch.length === 100 &&
      page === total
    )
      total++;
    if (total > 5)
      fail(
        "Import supports up to 500 products. Export a smaller catalog to import.",
      );
    rows.push(...batch);
  }
  return fromWooCommerce(rows);
}
