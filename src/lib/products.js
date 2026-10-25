import rawSeed from "../data/catalog.js";
import rawSamples from "../data/sample-catalog.js";
import { upgradeLayout } from "./merchandising.js";
const seed = upgradeLayout(rawSeed);
export const categories = [
  { id: "all", name: "All collections", icon: "grid" },
  { id: "sets", name: "Lingerie sets", icon: "heart" },
  { id: "bras", name: "Bras & bralettes", icon: "sparkles" },
  { id: "underwear", name: "Briefs & essentials", icon: "layers" },
  { id: "sleepwear", name: "Sleepwear", icon: "moon" },
  { id: "robes", name: "Robes & loungewear", icon: "shirt" },
];
export const products = seed.products;
export const defaultCatalog = seed;
export const money = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
export const productById = (id, catalog = products) =>
  catalog.find((p) => p.id === id);

export const currencyScale = (currency = "USD") =>
  10 **
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;

export const sampleCatalog = upgradeLayout(rawSamples);
