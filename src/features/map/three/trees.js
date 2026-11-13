// Pure: where trees stand (#123). Does not import three. Same data in, same trees out, so every load looks the same.
import { inRing, pathToRings } from "./extrude.js";
import { roadWidth } from "./campusMesh.js";
import { seedOf } from "../campusMap.js";

const CELL = 50; // grid cell for the obstacle lookup, meters
const GAP = 5; // no two trees closer than this
const CURB = 2; // trees stay this far off a road edge, path or wall
const STREET = { setback: 4.5, every: 11 }; // street trees: past the curb, one every 11 m (#123, #168)
const ROW_EVERY = 8; // along OSM tree rows
const WOOD_EVERY = 13; // woods: a jittered grid this tight
const LAWN = { edgeEvery: 15, inset: 7, middleEvery: 21 }; // lawns: clusters near the edge, some in the middle (#168: about twice as many)
const GROVE = { every: 15, keep: 0.72 }; // groves like the Quad: dense, under big trees (#168)
const NO_STREET_TREES = new Set(["service"]); // driveways and alleys

/** A small seeded random generator (mulberry32): the same seed gives the same numbers. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Is a point inside any ring of path `d`? Used for the campus edge. */
export const insideOf = (d) => {
  const rings = pathToRings(d);
  return (p) => rings.some((r) => inRing(p, r));
};

export { inRing };

const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const [dx, dy] = [bx - ax, by - ay];
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

/** Lines in path data "M1 2L3 4M..." as point lists. */
export const lines = (d) => String(d || "").split("M").slice(1).map((s) => {
  const n = (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}).filter((pts) => pts.length >= 2);

const bboxOf = (pts) => pts.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity]);

/** A grid of things trees may not stand on: inside a shape, or within `clear` meters of a line. */
function obstacles() {
  const cells = new Map();
  const put = (box, item) => {
    for (let i = Math.floor(box[0] / CELL); i <= Math.floor(box[2] / CELL); i++) {
      for (let j = Math.floor(box[1] / CELL); j <= Math.floor(box[3] / CELL); j++) {
        const k = `${i},${j}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(item);
      }
    }
  };
  return {
    shape(ring, clear = 0) {
      const b = bboxOf(ring);
      put([b[0] - clear, b[1] - clear, b[2] + clear, b[3] + clear], { ring, clear });
    },
    line(pts, clear) {
      for (let i = 0; i + 1 < pts.length; i++) {
        const b = bboxOf([pts[i], pts[i + 1]]);
        put([b[0] - clear, b[1] - clear, b[2] + clear, b[3] + clear], { a: pts[i], b: pts[i + 1], clear });
      }
    },
    blocked(p) {
      for (const o of cells.get(`${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)}`) || []) {
        if (o.ring) {
          if (inRing(p, o.ring)) return true;
          if (o.clear && o.ring.some((q, i) => segDist(p, q, o.ring[(i + 1) % o.ring.length]) < o.clear)) return true;
        } else if (segDist(p, o.a, o.b) < o.clear) return true;
      }
      return false;
    },
  };
}

/**
 * Every tree as [x, z, size], size 0 (small) to 2 (big).
 * nature: campus-nature.json. buildings: campus.json buildings ({ path }). bounds: [x0, y0, x1, y1], seeded fill stays inside it.
 * groves: rings to plant densely, like the Quad under its oaks; their trees are never the small size.
 * In order: OSM trees, OSM tree rows, street trees on campus roads, groves, then seeded fill on woods, lawns and the campus.
 * None stand inside a building, on a road or path, in water, a parking lot or a sports field.
 */
export function placeTrees(nature, buildings = [], bounds = [-Infinity, -Infinity, Infinity, Infinity], groves = []) {
  const block = obstacles();
  for (const b of buildings) for (const r of pathToRings(b.path)) block.shape(r, CURB);
  for (const o of nature.outlines || []) for (const r of pathToRings(o.path)) block.shape(r, CURB);
  for (const k of ["water", "parking", "pitch", "track"]) for (const r of pathToRings(nature[k])) block.shape(r, 1);
  for (const [type, d] of Object.entries(nature.roads || {})) for (const l of lines(d)) block.line(l, roadWidth(type) / 2 + CURB);
  for (const l of lines(nature.paths)) block.line(l, 1.25 + 1);

  const trees = [];
  const taken = new Map();
  const near = (p) => {
    const [i, j] = [Math.floor(p[0] / GAP), Math.floor(p[1] / GAP)];
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
      for (const q of taken.get(`${a},${b}`) || []) if (Math.hypot(p[0] - q[0], p[1] - q[1]) < GAP) return true;
    }
    return false;
  };
  const plant = (p, rand, where = () => true) => {
    if (!where(p) || block.blocked(p) || near(p)) return;
    const k = `${Math.floor(p[0] / GAP)},${Math.floor(p[1] / GAP)}`;
    if (!taken.has(k)) taken.set(k, []);
    taken.get(k).push(p);
    trees.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.floor(rand() * 3)]);
  };
  // Points every `step` meters along a line, from a seeded start.
  const along = (pts, step, rand, each) => {
    let carry = rand() * step;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = carry; t < len; t += step) each([a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len], [(b[0] - a[0]) / len, (b[1] - a[1]) / len]);
      carry = (carry - len) % step;
      if (carry < 0) carry += step;
    }
  };

  const rand = seeded(seedOf("trees"));
  for (const p of nature.trees || []) plant(p, rand);
  for (const l of lines(nature.treeRows)) along(l, ROW_EVERY, rand, (p) => plant(p, rand));

  const onCampus = insideOf(nature.campus);
  for (const [type, d] of Object.entries(nature.roads || {})) {
    if (NO_STREET_TREES.has(type)) continue;
    const off = roadWidth(type) / 2 + STREET.setback;
    for (const l of lines(d)) {
      along(l, STREET.every, rand, (p, [dx, dy]) => {
        plant([p[0] - dy * off, p[1] + dx * off], rand, onCampus);
        plant([p[0] + dy * off, p[1] - dx * off], rand, onCampus);
      });
    }
  }

  // Seeded fill: a jittered grid inside a ring, seeded by the ring's corner so it never shifts when other shapes change.
  const fill = (ring, step, keep, where) => {
    const r = seeded(seedOf(`${ring[0]}:${step}`));
    const b = bboxOf(ring);
    const [x0, y0, x1, y1] = [Math.max(b[0], bounds[0]), Math.max(b[1], bounds[1]), Math.min(b[2], bounds[2]), Math.min(b[3], bounds[3])];
    for (let x = x0; x < x1; x += step) {
      for (let y = y0; y < y1; y += step) {
        const p = [x + r() * step, y + r() * step];
        if (r() < keep && inRing(p, ring)) plant(p, r, where);
      }
    }
  };
  for (const ring of groves) {
    const from = trees.length;
    fill(ring, GROVE.every, GROVE.keep);
    for (let i = from; i < trees.length; i++) trees[i][2] = Math.max(1, trees[i][2]);
  }
  for (const ring of pathToRings(nature.wood)) fill(ring, WOOD_EVERY, 0.9);
  for (const ring of pathToRings(nature.grass)) {
    // Clusters of 1 to 3 just inside the edge, the way the Quad is lined.
    const r = seeded(seedOf(`${ring[0]}:edge`));
    along([...ring, ring[0]], LAWN.edgeEvery, r, (p, [dx, dy]) => {
      const side = inRing([p[0] - dy * LAWN.inset, p[1] + dx * LAWN.inset], ring) ? 1 : -1;
      const at = [p[0] - dy * LAWN.inset * side, p[1] + dx * LAWN.inset * side];
      for (let n = 1 + Math.floor(r() * 3); n > 0; n--) plant([at[0] + (r() - 0.5) * 8, at[1] + (r() - 0.5) * 8], r, (q) => inRing(q, ring));
    });
    fill(ring, LAWN.middleEvery, 0.7);
  }
  for (const ring of pathToRings(nature.campus)) fill(ring, LAWN.middleEvery, 0.7);
  return trees;
}
