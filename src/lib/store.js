import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sanitizeCart, setQuantity } from "./cart.js";
export const useCart = create(
  persist(
    (set) => ({
      items: {},
      change: (id, q) => set((s) => ({ items: setQuantity(s.items, id, q) })),
      add: (id) =>
        set((s) => ({
          items: setQuantity(s.items, id, (s.items[id] || 0) + 1),
        })),
      clear: () => set({ items: {} }),
    }),
    {
      name: "lunova-demo-cart-v1",
      partialize: (s) => ({ items: s.items }),
      merge: (saved, current) => ({
        ...current,
        items: sanitizeCart(saved?.items),
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
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    set({ selected: p, modal: null });
  },
  setCategory: (category) => set({ category }),
  setQuality: (quality) => set({ quality }),
  goTo: (position) => set({ teleport: { position, time: Date.now() } }),
  setModal: (modal) => {
    document.exitPointerLock?.();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    set({ modal });
  },
  setLocked: (locked) => set({ locked }),
  notify: (notice) => set({ notice }),
}));
