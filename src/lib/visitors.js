// Fixed browsing spots leave the entrance, aisle shortcuts and fixtures clear.
export const visitors = [
  {
    id: "cashier",
    position: [0, 0, -8.45],
    rotation: 0,
    skin: "#9f6a49",
    hair: "#29201c",
    outfit: "#536b64",
    staff: true,
  },
  {
    id: "shopper-rose",
    position: [-2.35, 0, 1.1],
    rotation: -Math.PI / 2,
    skin: "#c28c68",
    hair: "#32251e",
    outfit: "#886279",
  },
  {
    id: "shopper-blue",
    position: [6.05, 0, -4.1],
    rotation: -Math.PI / 2,
    skin: "#744b36",
    hair: "#211b19",
    outfit: "#637c91",
  },
];
export function activeVisitors(quality = "high", enabled = true) {
  return enabled ? visitors.slice(0, quality === "high" ? 3 : 2) : [];
}
export function visitorObstacles(quality, enabled) {
  if (!enabled) return [];
  return [
    { minX: -1.1, maxX: 1.1, minZ: -7.9, maxZ: -7.15 },
    ...activeVisitors(quality, enabled).map(({ position: [x, , z] }) => ({
      minX: x - 0.22,
      maxX: x + 0.22,
      minZ: z - 0.22,
      maxZ: z + 0.22,
    })),
  ];
}
