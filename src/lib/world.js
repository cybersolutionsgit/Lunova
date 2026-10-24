export const shelfCenters = [
  [-5, -2],
  [0, -2],
  [5, -2],
];
export const colliders = shelfCenters.map(([x, z]) => ({
  minX: x - 0.95,
  maxX: x + 0.95,
  minZ: z - 3.55,
  maxZ: z + 3.95,
}));
export function canOccupy(x, z) {
  const r = 0.32;
  return (
    x > -9.5 + r &&
    x < 9.5 - r &&
    z > -9 + r &&
    z < 12 - r &&
    !colliders.some(
      (b) =>
        x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r,
    )
  );
}
export function movePlayer(position, dx, dz) {
  // Substeps prevent tunneling through shelves on slow frames.
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.12));
  let { x, z } = position;
  for (let i = 0; i < n; i++) {
    if (canOccupy(x + dx / n, z)) x += dx / n;
    if (canOccupy(x, z + dz / n)) z += dz / n;
  }
  return { x, z };
}
export const aisleSpawns = {
  all: [0, 1.75, 9],
  produce: [-7.3, 1.75, 3.5],
  dairy: [-2.5, 1.75, 3.5],
  bakery: [2.5, 1.75, 3.5],
  pantry: [7.3, 1.75, 3.5],
  drinks: [7.3, 1.75, -5.5],
};
