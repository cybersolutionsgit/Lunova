import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sanitizeCart, setQuantity, hydrateCart } from "./cart.js";
import { defaultCatalog } from "./products.js";
import { validateCatalog } from "./catalog.js";
import { defaultSettings, validateSettings } from "./shop.js";
import { api } from "./api.js";
const payload = (result) => ({
  ...validateCatalog(result.catalog),
  settings: validateSettings(result.settings),
  revision: result.revision,
});
export const useCatalog = create((set, get) => ({
  ...defaultCatalog,
  settings: defaultSettings,
  revision: 0,
  backend: "loading",
  ready: false,
  admin: false,
  initialize: async () => {
    try {
      const result = await api("/api/store");
      set({
        ...payload(result),
        backend: result.configured ? "configured" : "unconfigured",
        ready: true,
      });
      useCart.setState((s) => ({
        items: sanitizeCart(s.items, result.catalog.products),
      }));
    } catch {
      set({ backend: "unavailable", ready: true });
    }
    try {
      const result = await api("/api/admin/session");
      set({ admin: result.authenticated === true });
    } catch {
      set({ admin: false });
    }
  },
  login: async (username, password) => {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const result = await api("/api/admin/store");
    set({ ...payload(result), admin: true, backend: "configured" });
  },
  logout: async () => {
    await api("/api/admin/logout", { method: "POST" });
    set({ admin: false });
  },
  refresh: async () => {
    const result = await api("/api/admin/store");
    set(payload(result));
  },
  publish: async (catalog, settings) => {
    try {
      const result = await api("/api/admin/store", {
        method: "PUT",
        body: JSON.stringify({
          catalog: validateCatalog(catalog),
          settings: validateSettings(settings),
          revision: get().revision,
        }),
      });
      set(payload(result));
      useCart.setState((s) => ({
        items: sanitizeCart(s.items, result.catalog.products),
      }));
    } catch (e) {
      if (e.status === 401) set({ admin: false });
      throw e;
    }
  },
  replace: async (input) => get().publish(input, get().settings),
  updateSettings: async (settings) => get().publish(get(), settings),
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
        items: hydrateCart(saved?.items),
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
