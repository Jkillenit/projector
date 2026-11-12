// Pure: campus.json shapes as flat arrays the 3D view hands to three. Does not import three.
import { extrudeRings, pathToRings } from "./extrude.js";

/**
 * All buildings as one shape, so the view draws them in a single mesh.
 * Returns { positions, indices, owners: [{ id, start, end }] (vertex ranges, for coloring one building), triOwner: [id per triangle] (for tapping) }.
 */
export function mergeBuildings(buildings) {
  const positions = [];
  const indices = [];
  const owners = [];
  const triOwner = [];
  for (const b of buildings || []) {
    const start = positions.length / 3;
    for (const s of extrudeRings(pathToRings(b.path), b.h)) {
      const base = positions.length / 3;
      for (const v of s.positions) positions.push(v);
      for (const i of s.indices) indices.push(base + i);
      for (let t = 0; t < s.indices.length / 3; t++) triOwner.push(b.id);
    }
    const end = positions.length / 3;
    if (end > start) owners.push({ id: b.id, start, end });
  }
  return { positions, indices, owners, triOwner };
}

/** "M1 2L3 4L5 6M..." -> flat line segment points [x, y, z, x, y, z, ...] at height y, for three's LineSegments. */
export function roadSegments(d, y = 0) {
  const out = [];
  for (const seg of String(d || "").split("M").slice(1)) {
    const nums = (seg.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    for (let i = 2; i + 1 < nums.length; i += 2) out.push(nums[i - 2], y, nums[i - 1], nums[i], y, nums[i + 1]);
  }
  return out;
}
