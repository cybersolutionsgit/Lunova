export const STORE_TYPES = {
  boutique: {
    name: "Boutique",
    fixture: "glass-photo",
    description: "Glass cases with large featured product photos",
    collections: [
      ["sets", "Lingerie sets", "heart"],
      ["bras", "Bras & bralettes", "sparkles"],
      ["underwear", "Briefs & essentials", "layers"],
      ["sleepwear", "Sleepwear", "moon"],
      ["robes", "Robes & loungewear", "shirt"],
    ],
  },
  shoes: {
    name: "Shoe shop",
    fixture: "shoe-wall",
    description: "Shoe stands and display walls",
    collections: [
      ["shoe-sneakers", "Sneakers", "package"],
      ["shoe-heels", "Heels", "sparkles"],
      ["shoe-formal", "Formal shoes", "package"],
      ["shoe-sandals", "Sandals", "layers"],
      ["shoe-boots", "Boots", "package"],
    ],
  },
  bakery: {
    name: "Bakery",
    fixture: "glass-counter",
    description: "Glazed pastry counters",
    collections: [
      ["bakery-bread", "Bread", "package"],
      ["bakery-cakes", "Cakes", "heart"],
      ["bakery-pastry", "Pastries", "sparkles"],
      ["bakery-cookies", "Cookies", "package"],
      ["bakery-drinks", "Drinks", "layers"],
    ],
  },
  mart: {
    name: "Supermarket",
    fixture: "shelves",
    description: "Stocked grocery shelving",
    collections: [
      ["mart-produce", "Fruit & vegetables", "layers"],
      ["mart-dairy", "Dairy & eggs", "package"],
      ["mart-pantry", "Pantry essentials", "package"],
      ["mart-drinks", "Drinks", "layers"],
      ["mart-household", "Household", "package"],
    ],
  },
  beauty: {
    name: "Beauty & cosmetics",
    fixture: "beauty-counter",
    description: "Beauty counters and bottle displays",
    collections: [
      ["beauty-skin", "Skincare", "sparkles"],
      ["beauty-makeup", "Makeup", "heart"],
      ["beauty-fragrance", "Fragrance", "package"],
      ["beauty-hair", "Haircare", "layers"],
    ],
  },
  jewelry: {
    name: "Jewelry",
    fixture: "jewelry-case",
    description: "Glass jewelry showcases",
    collections: [
      ["jewelry-necklaces", "Necklaces", "sparkles"],
      ["jewelry-rings", "Rings", "heart"],
      ["jewelry-earrings", "Earrings", "sparkles"],
      ["jewelry-bracelets", "Bracelets", "layers"],
    ],
  },
  electronics: {
    name: "Electronics",
    fixture: "tech-stand",
    description: "Technology display stands",
    collections: [
      ["tech-phones", "Phones", "package"],
      ["tech-computers", "Computers", "package"],
      ["tech-audio", "Audio", "layers"],
      ["tech-accessories", "Accessories", "sparkles"],
    ],
  },
  furniture: {
    name: "Furniture & home",
    fixture: "home-stage",
    description: "Room displays and furniture platforms",
    collections: [
      ["home-seating", "Seating", "package"],
      ["home-tables", "Tables", "layers"],
      ["home-lighting", "Lighting", "sparkles"],
      ["home-decor", "Decor", "heart"],
    ],
  },
  general: {
    name: "General store",
    fixture: "display-stand",
    description: "Flexible product stands",
    collections: [
      ["general-new", "New arrivals", "sparkles"],
      ["general-featured", "Featured", "heart"],
      ["general-essentials", "Essentials", "package"],
    ],
  },
};
export const allCategories = [
  { id: "all", name: "All collections", icon: "grid" },
  ...Object.values(STORE_TYPES).flatMap((t) =>
    t.collections.map(([id, name, icon]) => ({ id, name, icon })),
  ),
];
export function getCollections(type, products = []) {
  const chosen = (STORE_TYPES[type] || STORE_TYPES.boutique).collections.map(
    ([id, name, icon]) => ({ id, name, icon }),
  );
  const ids = new Set(chosen.map((c) => c.id));
  const retained = allCategories.filter(
    (c) =>
      c.id !== "all" &&
      !ids.has(c.id) &&
      products.some((p) => p.category === c.id),
  );
  return [allCategories[0], ...chosen, ...retained];
}
export const defaultSettings = {
  name: "Lunova Secrets",
  tagline: "Your private boutique.",
  description: "Discover your collection in a space designed around you.",
  type: "boutique",
  address: "",
  phone: "",
  email: "",
  website: "https://lunovasecrets.com",
  logo: "",
  theme: {
    primary: "#805064",
    surface: "#fff7ef",
    wall: "#c9a5a5",
    floor: "#eee5dc",
    metal: "#b69565",
  },
};
export function validateSettings(value) {
  if (!value || !STORE_TYPES[value.type])
    throw new Error("Choose a supported store type.");
  const text = (v, max) =>
    String(v ?? "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, max);
  const name = text(value.name, 80);
  if (!name) throw new Error("Enter a store name.");
  const theme = {};
  for (const key of Object.keys(defaultSettings.theme)) {
    if (!/^#[0-9a-f]{6}$/i.test(value.theme?.[key]))
      throw new Error("Choose valid theme colors.");
    theme[key] = value.theme[key];
  }
  const url = (v) => {
    if (!v) return "";
    try {
      const u = new URL(v);
      if (u.protocol === "https:" && !u.username && !u.password) return u.href;
    } catch {}
    throw new Error("Use an HTTPS URL for website and logo.");
  };
  const logo = /^\/(?!\/)[^\\\s]*$/.test(value.logo || "")
    ? value.logo
    : url(value.logo);
  return {
    name,
    tagline: text(value.tagline, 120),
    description: text(value.description, 1000),
    type: value.type,
    address: text(value.address, 250),
    phone: text(value.phone, 80),
    email: text(value.email, 120),
    website: url(value.website),
    logo,
    theme,
  };
}

export function contrastColor(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.179
    ? "#281f27"
    : "#ffffff";
}
