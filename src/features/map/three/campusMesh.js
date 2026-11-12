// Pure: campus.json shapes as flat arrays the 3D view hands to three. Does not import three.
import { extrudeRings, pathToRings } from "./extrude.js";

/**
 * All buildings as one shape, so the view draws them in a single mesh.
 * Returns { positions, uvs (meters), isRoof: [per vertex], indices: all walls first, then all roofs, wallIndices: how many indices are walls,
 * owners: [{ id, start, end }] (vertex ranges, for coloring one building), triOwner: [id per triangle] (for tapping) }.
 */
export function mergeBuildings(buildings) {
  const positions = [];
  const uvs = [];
  const isRoof = [];
  const owners = [];
  const walls = { indices: [], owner: [] };
  const roofs = { indices: [], owner: [] };
  for (const b of buildings || []) {
    const start = positions.length / 3;
    for (const s of extrudeRings(pathToRings(b.path), b.h)) {
      const base = positions.length / 3;
      for (const v of s.positions) positions.push(v);
      for (const v of s.uvs) uvs.push(v);
      for (let v = 0; v < s.positions.length / 3; v++) isRoof.push(v >= s.wallVerts);
      s.indices.forEach((i, k) => {
        const part = k < s.wallIndices ? walls : roofs;
        part.indices.push(base + i);
        if (k % 3 === 0) part.owner.push(b.id);
      });
    }
    const end = positions.length / 3;
    if (end > start) owners.push({ id: b.id, start, end });
  }
  return {
    positions, uvs, isRoof, owners,
    indices: walls.indices.concat(roofs.indices),
    wallIndices: walls.indices.length,
    triOwner: walls.owner.concat(roofs.owner),
  };
}

/** Landmarks get crimson brick so they stand out (#122). Bryant-Denny is only an area in OSM, so it has no walls to color. */
const LANDMARKS = new Set(["Amelia Gayle Gorgas Library", "Denny Chimes", "University of Alabama Student Center"]);
export const isLandmark = (name) => LANDMARKS.has(name);

/** Flat ground layers, bottom first. Each one draws over the ones before it. */
export const GROUND_LAYERS = ["wood", "grass", "pitch", "water", "parking", "roads", "paths"];

/** Road width in meters by OSM highway type. Paths are narrow. */
export const ROAD_WIDTH = { primary: 14, secondary: 12, tertiary: 10, unclassified: 8, residential: 8, service: 5 };
export const PATH_WIDTH = 2.5;
const OTHER_ROAD = 6;
export const roadWidth = (type) => ROAD_WIDTH[type] ?? OTHER_ROAD;

const MITER_LIMIT = 2; // a sharp corner sticks out at most twice the half width

/**
 * A line as the two edges of a ribbon `width` wide: { left: [[x, y], ...], right: [...] }, one point each per line point.
 * Corners are mitered so the ribbon keeps its width around turns. Repeated points are dropped.
 */
export function lineToRibbon(points, width) {
  const pts = (points || []).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
  const left = [];
  const right = [];
  if (pts.length < 2 || !(width > 0)) return { left, right };
  const half = width / 2;
  const normal = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  pts.forEach((p, i) => {
    const n1 = normal(pts[Math.max(0, i - 1)], pts[Math.max(1, i)]);
    const n2 = normal(pts[Math.min(i, pts.length - 2)], pts[Math.min(i + 1, pts.length - 1)]);
    let [mx, my] = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) [mx, my] = n1; // the line turns straight back
    else [mx, my] = [mx / ml, my / ml];
    const k = half / Math.max(mx * n1[0] + my * n1[1], 1 / MITER_LIMIT);
    left.push([p[0] + mx * k, p[1] + my * k]);
    right.push([p[0] - mx * k, p[1] - my * k]);
  });
  return { left, right };
}

/** Every line in path data "M1 2L3 4M..." as a flat ribbon at y = 0, added to shape { positions, indices }. Faces point up. */
export function addRibbons(shape, d, width) {
  for (const seg of String(d || "").split("M").slice(1)) {
    const nums = (seg.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const { left, right } = lineToRibbon(pts, width);
    const base = shape.positions.length / 3;
    left.forEach(([lx, lz], i) => shape.positions.push(lx, 0, lz, right[i][0], 0, right[i][1]));
    for (let i = 0; i + 1 < left.length; i++) {
      const v = base + i * 2;
      shape.indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  return shape;
}
