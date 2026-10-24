// Fixed fixture footprints keep movement safe even when products are reassigned.
export const displays = [
  { position: [0, 3], rotation: 0 },
  { position: [-4.3, 1], rotation: 0 },
  { position: [4.3, 1], rotation: 0 },
  { position: [-7.8, -2], rotation: Math.PI / 2 },
  { position: [7.8, -2], rotation: -Math.PI / 2 },
  { position: [-4.3, -5], rotation: 0 },
  { position: [0, -5], rotation: 0 },
  { position: [4.3, -5], rotation: 0 },
  { position: [-7.8, 4], rotation: Math.PI / 2 },
  { position: [7.8, 4], rotation: -Math.PI / 2 },
  { position: [-4.3, -8], rotation: 0 },
  { position: [4.3, -8], rotation: 0 },
];
export const colliders = displays.map(({ position: [x, z], rotation }) => {
  const side = Math.abs(rotation) > 0.1;
  const w = side ? 0.65 : 1.2,
    d = side ? 1.2 : 0.65;
  return { minX: x - w, maxX: x + w, minZ: z - d, maxZ: z + d };
});
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
  sets: [0, 1.75, 6],
  bras: [-4.3, 1.75, 4],
  underwear: [4.3, 1.75, 4],
  sleepwear: [-6, 1.75, 1],
  robes: [6, 1.75, 1],
};
