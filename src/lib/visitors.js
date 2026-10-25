// Two fixed aisle lanes, with roomy turning spots beyond the shelf ends.
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
    position: [-2.25, 0, 6.8],
    rotation: Math.PI,
    skin: "#c28c68",
    hair: "#32251e",
    outfit: "#886279",
    offset: 5,
  },
  {
    id: "shopper-blue",
    position: [2.25, 0, 6.8],
    rotation: Math.PI,
    skin: "#744b36",
    hair: "#211b19",
    outfit: "#637c91",
    offset: 18,
  },
];
export const visitorPoses = new Map(); // Render-loop poses, never React state or saved customer data.
export function activeVisitors(quality = "high", enabled = true) {
  return enabled ? visitors.slice(0, quality === "high" ? 3 : 2) : [];
}
const smooth = (t) => t * t * (3 - 2 * t);
export const ROUTE_TRAVEL = 22,
  ROUTE_STOP = 3,
  ROUTE_TURN = 3;
export const ROUTE_PERIOD = (ROUTE_TRAVEL + ROUTE_STOP + ROUTE_TURN) * 2;
export function sampleVisitor(person, elapsed = 0) {
  const [x, , initialZ] = person.position;
  if (person.staff)
    return { x, z: initialZ, yaw: person.rotation, speed: 0, distance: 0 };
  const time =
    (((elapsed + person.offset) % ROUTE_PERIOD) + ROUTE_PERIOD) % ROUTE_PERIOD;
  const half = ROUTE_PERIOD / 2,
    back = time >= half,
    t = time % half;
  const start = back ? -2.65 : 6.8,
    end = back ? 6.8 : -2.65;
  const progress = Math.min(t / ROUTE_TRAVEL, 1),
    travel = smooth(progress);
  const turn = smooth(
    Math.max(0, Math.min(1, (t - ROUTE_TRAVEL - ROUTE_STOP) / ROUTE_TURN)),
  );
  return {
    x,
    z: start + (end - start) * travel,
    yaw: (back ? Math.PI * 2 : Math.PI) + Math.PI * turn,
    speed:
      t < ROUTE_TRAVEL
        ? (9.45 / ROUTE_TRAVEL) * 6 * progress * (1 - progress)
        : 0,
    distance: (back ? 9.45 : 0) + 9.45 * travel,
  };
}
export function trolleyPosition(pose) {
  return {
    x: pose.x + Math.sin(pose.yaw) * 0.86,
    z: pose.z + Math.cos(pose.yaw) * 0.86,
  };
}
export function visitorMustYield(pose, player) {
  const trolley = trolleyPosition(pose);
  return (
    Math.hypot(pose.x - player.x, pose.z - player.z) < 0.86 ||
    Math.hypot(trolley.x - player.x, trolley.z - player.z) < 0.92
  );
}
export function visitorObstacles(quality, enabled, poses) {
  if (!enabled) return [];
  const result = [{ minX: -1.1, maxX: 1.1, minZ: -7.9, maxZ: -7.15 }];
  for (const person of activeVisitors(quality, enabled)) {
    const pose = poses?.get(person.id) ?? sampleVisitor(person);
    result.push({
      minX: pose.x - 0.23,
      maxX: pose.x + 0.23,
      minZ: pose.z - 0.23,
      maxZ: pose.z + 0.23,
    });
    if (!person.staff) {
      const cart = trolleyPosition(pose),
        s = Math.abs(Math.sin(pose.yaw)),
        c = Math.abs(Math.cos(pose.yaw));
      const w = c * 0.31 + s * 0.45,
        d = c * 0.45 + s * 0.31;
      result.push({
        minX: cart.x - w,
        maxX: cart.x + w,
        minZ: cart.z - d,
        maxZ: cart.z + d,
      });
    }
  }
  return result;
}
