import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sanitizeCart, setQuantity } from "./cart.js";
import { defaultCatalog } from "./products.js";
import { CATALOG_KEY, validateCatalog } from "./catalog.js";
function loadCatalog() {
  try {
    return validateCatalog(
      JSON.parse(localStorage.getItem(CATALOG_KEY)) || defaultCatalog,
    );
  } catch {
    return validateCatalog(defaultCatalog);
  }
}
export const useCatalog = create((set) => ({
  ...loadCatalog(),
  replace: (input) => {
    const next = validateCatalog(input);
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        "Your browser could not save this catalog. Free some storage or use smaller image files. Nothing was changed.",
      );
    }
    set(next);
    useCart.setState((s) => ({ items: sanitizeCart(s.items, next.products) }));
  },
}));
export const useCart = create(
  persist(
    (set) => ({
      items: {},
      change: (id, q) =>
        set((s) => ({
          items: setQuantity(s.items, id, q, useCatalog.getState().products),
        })),
      add: (id) =>
        set((s) => ({
          items: setQuantity(
            s.items,
            id,
            (s.items[id] || 0) + 1,
            useCatalog.getState().products,
          ),
        })),
      clear: () => set({ items: {} }),
    }),
    {
      name: "lunova-boutique-cart-v2",
      partialize: (s) => ({ items: s.items }),
      merge: (saved, current) => ({
        ...current,
        items: sanitizeCart(saved?.items, useCatalog.getState().products),
      }),
    },
  ),
);
export const useWorld = create((set) => ({
  selected: null,
  category: "all",
  quality: "high",
  teleport: null,
  modal: null,
  locked: false,
  notice: "",
  select: (p) => {
    document.exitPointerLock?.();
    set({ selected: p, modal: null });
  },
  setCategory: (category) => set({ category }),
  setQuality: (quality) => set({ quality }),
  goTo: (position) => set({ teleport: { position, time: Date.now() } }),
  setModal: (modal) => {
    document.exitPointerLock?.();
    set({ modal });
  },
  setLocked: (locked) => set({ locked }),
  notify: (notice) => set({ notice }),
}));
