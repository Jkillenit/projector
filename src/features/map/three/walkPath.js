// Pure: a building's route and steps as a 3D line for the walkthrough (#67). Does not import three.
import { toCampus } from "../indoor/indoorData.js";

/** Floors are drawn this many floor heights apart, so both ends of a route that changes floors show. */
export const SPREAD = 3;
const LIFT = 0.6; // the route line floats this far over the floor

/** Height of a floor's slab in the walkthrough. The lowest floor is at 0. */
export function floorY(level, indoor) {
  const levels = indoor.floors.map((f) => f.level).sort((a, b) => a - b);
  return Math.max(0, levels.indexOf(level)) * indoor.floorHeight * SPREAD;
}

/** A plan point on a floor -> [x, y, z] in 3D meters (map x -> x, map y -> z). */
export function to3d(at, level, indoor, lift = 0) {
  const [x, z] = toCampus(at, indoor);
  return [x, floorY(level, indoor) + lift, z];
}

/**
 * The route as a 3D line: { points, at: [distance to each point], total, stepEnds: [distance where each step ends] }.
 * Steps come from steps.js and keep the route's own point objects, so we find them by identity.
 */
export function walkLine(route, steps, indoor) {
  const points = route.points.map((p) => to3d(p.at, p.floor, indoor, LIFT));
  const at = [0];
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + Math.hypot(...points[i].map((v, k) => v - points[i - 1][k])));
  const stepEnds = steps.map((s) => at[Math.max(0, route.points.indexOf(s.points.at(-1)))]);
  return { points, at, total: at.at(-1) || 0, stepEnds };
}

/** The point at distance s along the line (clamped to its ends). */
export function pointAt(line, s) {
  const { points, at } = line;
  if (s <= 0 || points.length < 2) return points[0];
  for (let i = 1; i < points.length; i++) {
    if (s <= at[i]) {
      const k = at[i] > at[i - 1] ? (s - at[i - 1]) / (at[i] - at[i - 1]) : 1;
      return points[i - 1].map((v, j) => v + (points[i][j] - v) * k);
    }
  }
  return points.at(-1);
}
