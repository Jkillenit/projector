// Pure: roofs from footprints (#166). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings draws them in the one building mesh and tapping still works.
import { extrudeRings, inRing, insetRing, pathToRings, ringArea } from "./extrude.js";
import { seedOf, simplify } from "../campusMap.js";

/**
 * Meters. flatOver: footprints past this keep a flat roof (m²); tall: so do towers this high. Slopes go in at most maxInset and rise
 * pitch meters per meter in. smooth: wall jogs smaller than this do not bend the roof. parapet and lip: the light rim of a flat roof.
 */
export const ROOF = { flatOver: 4000, tall: 28, min: 4, maxInset: 9, pitch: 0.55, smooth: 1.5, parapet: 0.9, lip: 0.6, unit: [5, 3.5, 1.8], unitEvery: 1800 };
const ROUND = /coliseum|arena|indoor|natatorium|dome/i; // big halls with a curved roof
const STEPS = [0.25, 0.5, 0.75, 1]; // a rounded roof is this many slopes, each flatter than the last

/**
 * The roof a building gets: "plain" (a flat top, as before), "flat" (a rim and rooftop units), "hip" or "round".
 * OSM's roof:shape wins. Untagged: big footprints and towers are flat, halls named like an arena are round, the rest are hipped.
 * b: { h, path, name, roofShape, plain }. plain: true keeps the flat top (parking decks, the quiet town off campus).
 */
export function roofOf(b) {
  if (!b || b.plain || !(b.h >= ROOF.min)) return "plain";
  const tag = String(b.roofShape || "").toLowerCase();
  if (tag === "flat") return "flat";
  if (/dome|round|barrel|onion/.test(tag) || (!tag && ROUND.test(b.name || ""))) return "round";
  if (tag) return "hip"; // gabled draws as a hip with gable ends (#194, ridgeRoof); pyramidal and the rest as hipped
  const area = pathToRings(b.path).reduce((s, r) => s + ringArea(r), 0);
  return area > ROOF.flatOver || b.h >= ROOF.tall ? "flat" : "hip";
}

const perimeter = (ring) => ring.reduce((s, p, i) => s + Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1]), 0);

/** Slopes for a ring: [[inset, rise], ...] for extrudeRings, sized to the ring's narrow side, or null when it is too thin or jagged. */
export function roofTiers(ring, kind) {
  const narrow = (2 * ringArea(ring)) / (perimeter(ring) || 1); // about the short side of a long box, half the side of a square
  // #194: go in as far as the ring allows, so narrow halls of any shape close to about a ridge, then back off.
  const tries = [0.49, 0.45, 0.35].map((k) => Math.min(ROOF.maxInset, narrow * k));
  for (let d = tries.at(-1) / 2; d >= 0.8; d /= 2) tries.push(d);
  for (const d of new Set(tries)) {
    if (d < 0.8 || !insetRing(ring, d)) continue;
    if (kind !== "round") return [[d, d * ROOF.pitch]];
    return STEPS.map((f) => [d * f, d * ROOF.pitch * 1.6 * Math.sin((f * Math.PI) / 2)]);
  }
  return null;
}

const lift = (s, y0) => {
  for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
  return s;
};
const lifted = (shapes, y0, trim) => shapes.map((s) => {
  for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
  return trim ? Object.assign(s, { uvs: s.uvs.map(() => 0), wallVerts: 0, wallIndices: 0, trim: true }) : s;
});

/** A flat roof: walls up to a light rim, the roof inside it, and a few units on top (seeded by id, never over the edge). */
export function flatRoof(ring, h, id) {
  const inner = insetRing(ring, ROOF.parapet);
  if (!inner) return extrudeRings([ring], h);
  const top = h + ROOF.lip;
  const [roof] = extrudeRings([ring], top, { walls: false, tiers: [[ROOF.parapet, 0]] });
  const n = roof.positions.length / 3 - inner.length; // the rim's corners come first, then the roof inside it
  const rim = { positions: roof.positions.slice(0, n * 3), indices: roof.indices.filter((i) => i < n), uvs: new Array(n * 2).fill(0), wallVerts: 0, wallIndices: 0, trim: true };
  const cap = { positions: roof.positions.slice(n * 3), indices: roof.indices.filter((i) => i >= n).map((i) => i - n), uvs: roof.uvs.slice(n * 2), wallVerts: 0, wallIndices: 0 };
  const shapes = [...extrudeRings([ring], top, { roof: false }), rim, cap];
  const xs = ring.map((p) => p[0]);
  const zs = ring.map((p) => p[1]);
  const [x0, z0, w, d] = [Math.min(...xs), Math.min(...zs), Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)];
  const [ux, uz, uh] = ROOF.unit;
  const want = Math.min(7, Math.max(2, Math.floor(ringArea(ring) / ROOF.unitEvery)));
  const placed = [];
  for (let k = 0; k < 40 && placed.length < want; k++) {
    const [x, z] = [x0 + (w * (seedOf(`${id}:x${k}`) % 1000)) / 1000, z0 + (d * (seedOf(`${id}:z${k}`) % 1000)) / 1000];
    const box = [[x - ux, z - uz], [x + ux, z - uz], [x + ux, z + uz], [x - ux, z + uz]]; // twice the unit: room around it
    if (!box.every((p) => inRing(p, inner)) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < ux * 2.5)) continue;
    placed.push([x, z]);
    shapes.push(...lifted(extrudeRings([box.map(([bx, bz]) => [(bx + x) / 2, (bz + z) / 2])], uh), top, true));
  }
  return shapes;
}

const NEAR_SQUARE = 0.2; // a corner counts as square within about 12 degrees

/** The four corners in order with the long side first ([a, b] is a long side), or null when the ring is not about a rectangle. */
export function asRectangle(ring) {
  if (ring?.length !== 4) return null;
  const edge = (i) => [ring[(i + 1) % 4][0] - ring[i][0], ring[(i + 1) % 4][1] - ring[i][1]];
  for (let i = 0; i < 4; i++) {
    const [u, v] = [edge(i), edge((i + 1) % 4)];
    const lu = Math.hypot(...u);
    const lv = Math.hypot(...v);
    if (!lu || !lv || Math.abs((u[0] * v[0] + u[1] * v[1]) / (lu * lv)) > NEAR_SQUARE) return null;
  }
  const long = Math.hypot(...edge(0)) + Math.hypot(...edge(2)) >= Math.hypot(...edge(1)) + Math.hypot(...edge(3));
  return long ? ring : [ring[1], ring[2], ring[3], ring[0]];
}

/** One flat face, turned so it points along `toward`. pts: 3 or 4 corners [x, y, z]; uv: [u, v] per corner. */
function face(shape, pts, toward, uv) {
  const [a, b, c] = pts;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const flip = n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0;
  const [order, uvs] = flip ? [[...pts].reverse(), [...uv].reverse()] : [pts, uv];
  const base = shape.positions.length / 3;
  order.forEach((p, i) => {
    shape.positions.push(...p);
    shape.uvs.push(...uvs[i]);
  });
  shape.indices.push(base, base + 1, base + 2);
  if (order.length === 4) shape.indices.push(base, base + 2, base + 3);
}

/**
 * A roof that comes to a ridge on an about rectangular hall (#194): two long slopes up to a ridge along the long side, and either
 * two short slopes (hip) or two upright brick triangles (gable) at the ends. Rise: half the short side times the pitch.
 * gable: true or false for both ends, or [start, end] for each: start is the p3 to p0 end, end the p1 to p2 end (#200).
 * pitch: rise per meter in from the eave (#200: low pediment gables on Gorgas).
 * Same shape format as extrudeRings: walls (and gable ends) first, then the roof. walls: false leaves out the walls, not the gable ends.
 */
export function ridgeRoof(ring, h, gable = false, { walls: withWalls = true, pitch = ROOF.pitch } = {}) {
  const [p0, p1, p2, p3] = asRectangle(ring);
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const w = (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p0[0] - p3[0], p0[1] - p3[1])) / 2;
  const u = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [g0, g1] = Array.isArray(gable) ? gable : [gable, gable];
  const back = (g) => (g ? 0 : Math.min(w / 2, len / 2)); // hips: the ridge stops half the width in from the end
  const top = h + (w / 2) * pitch;
  const [m0, m1] = [mid(p3, p0), mid(p1, p2)];
  const r0 = [m0[0] + u[0] * back(g0), top, m0[1] + u[1] * back(g0)];
  const r1 = [m1[0] - u[0] * back(g1), top, m1[1] - u[1] * back(g1)];
  const at = ([x, z]) => [x, h, z];
  const c = centroid4(ring);
  const out = (a, b) => {
    const m = mid(a, b);
    return [m[0] - c[0], m[1] - c[1]];
  };
  const [walls] = withWalls ? extrudeRings([ring], h, { roof: false }) : [{ positions: [], indices: [], uvs: [] }];
  const shape = { positions: [...walls.positions], indices: [...walls.indices], uvs: [...walls.uvs] };
  const flat = (pts) => pts.map((p) => [p[0], p[2]]);
  for (const [a, b, r, g] of [[p1, p2, r1, g1], [p3, p0, r0, g0]]) {
    if (g) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const o = out(a, b);
      face(shape, [at(a), at(b), r], [o[0], 0, o[1]], [[0, h], [d, h], [d / 2, top]]);
    }
  }
  const wallVerts = shape.positions.length / 3;
  const wallIndices = shape.indices.length;
  const slope = (a, b, o) => [o[0], Math.hypot(...o) / pitch, o[1]];
  let pts = [at(p0), at(p1), r1, r0];
  face(shape, pts, slope(p0, p1, out(p0, p1)), flat(pts));
  pts = [at(p2), at(p3), r0, r1];
  face(shape, pts, slope(p2, p3, out(p2, p3)), flat(pts));
  if (!g1) {
    pts = [at(p1), at(p2), r1];
    face(shape, pts, slope(p1, p2, out(p1, p2)), flat(pts));
  }
  if (!g0) {
    pts = [at(p3), at(p0), r0];
    face(shape, pts, slope(p3, p0, out(p3, p0)), flat(pts));
  }
  return { ...shape, wallVerts, wallIndices };
}
const centroid4 = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);

const SLANT = 0.27; // walls within about 15 degrees of square still make wings; OSM outlines are rarely exact

/**
 * The wings of a right angled outline (#194): rectangles that together cover it, each running the full length of its wing, so
 * an L or U hall is two or three long boxes that overlap at the corners. [[p0, p1, p2, p3], ...] in map meters, long side first,
 * or null when the outline is not about right angled or would need more than `max` boxes.
 */
export function wings(ring, { snap = 1.5, max = 8 } = {}) {
  if (!(ring?.length >= 4)) return null;
  // Turn into a frame along the longest wall.
  let [ax, az, best] = [1, 0, 0];
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) [ax, az, best] = [(q[0] - p[0]) / l, (q[1] - p[1]) / l, l];
  });
  const local = ring.map(([x, z]) => [x * ax + z * az, -x * az + z * ax]);
  for (let i = 0; i < local.length; i++) {
    const [p, q] = [local[i], local[(i + 1) % local.length]];
    const [dx, dz] = [Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])];
    if (Math.min(dx, dz) > SLANT * Math.max(dx, dz) && Math.hypot(dx, dz) > 10) return null; // a long slanted wall; jogs and cut corners are fine
  }
  const lines = (vals) => vals.sort((a, b) => a - b).reduce((out, v) => (out.length && v - out.at(-1) < snap ? out : [...out, v]), []);
  const xs = lines(local.map((p) => p[0]));
  const zs = lines(local.map((p) => p[1]));
  const inside = zs.slice(1).map((z, j) => xs.slice(1).map((x, i) => inRing([(x + xs[i]) / 2, (z + zs[j]) / 2], local)));
  const full = (i0, i1, j0, j1) => {
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!inside[j]?.[i]) return false;
    return true;
  };
  const boxes = [];
  for (let j = 0; j < inside.length; j++) {
    for (let i = 0; i < inside[j].length; i++) {
      if (!inside[j][i]) continue;
      // Run along x as far as it goes, then grow in z; and the other way round. Keep both: one is each wing through this cell.
      for (const firstX of [true, false]) {
        let [i0, i1, j0, j1] = [i, i + 1, j, j + 1];
        const grow = (alongX) => {
          if (alongX) {
            while (i0 > 0 && full(i0 - 1, i0, j0, j1)) i0--;
            while (i1 < xs.length - 1 && full(i1, i1 + 1, j0, j1)) i1++;
          } else {
            while (j0 > 0 && full(i0, i1, j0 - 1, j0)) j0--;
            while (j1 < zs.length - 1 && full(i0, i1, j1, j1 + 1)) j1++;
          }
        };
        grow(firstX);
        grow(!firstX);
        boxes.push([i0, i1, j0, j1]);
      }
    }
  }
  const area = ([i0, i1, j0, j1]) => (xs[i1] - xs[i0]) * (zs[j1] - zs[j0]);
  const t = 2.5; // meters: a box that nearly fits in a bigger one is the same wing (a cut corner or a small jog)
  const within = (a, b) => xs[a[0]] >= xs[b[0]] - t && xs[a[1]] <= xs[b[1]] + t && zs[a[2]] >= zs[b[2]] - t && zs[a[3]] <= zs[b[3]] + t;
  const kept = [];
  for (const b of boxes.sort((a, b) => area(b) - area(a))) if (!kept.some((k) => within(b, k))) kept.push(b);
  if (kept.length > max) return null;
  const world = ([u, v]) => [u * ax - v * az, u * az + v * ax];
  const out = kept.map(([i0, i1, j0, j1]) => asRectangle([[xs[i0], zs[j0]], [xs[i1], zs[j0]], [xs[i1], zs[j1]], [xs[i0], zs[j1]]].map(world)));
  return out.every(Boolean) ? out : null;
}

/** A hipped roof over one wing: to a ridge when it is narrow enough, else slopes in by maxInset to a flat top. Roof only. */
function wingRoof(box, h) {
  const short = Math.hypot(box[2][0] - box[1][0], box[2][1] - box[1][1]);
  if (short / 2 <= ROOF.maxInset) return ridgeRoof(box, h, false, { walls: false });
  const [s] = extrudeRings([box], 0.01, { walls: false, tiers: [[ROOF.maxInset, ROOF.maxInset * ROOF.pitch - 0.01]] });
  for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += h - 0.01;
  return s;
}

/**
 * A building's rings as walls and a roof of its kind (roofOf). Hipped and round roofs follow the outline with small wall jogs
 * smoothed away, over a flat top that closes any gap. A ring with no room for slopes keeps its flat top.
 */
export function roofedShapes(b) {
  const rings = pathToRings(b?.path);
  const kind = roofOf(b);
  if (kind === "plain") return extrudeRings(rings, b?.h);
  return rings.flatMap((ring) => {
    if (kind === "flat") return flatRoof(ring, b.h, b.id);
    const smooth = simplify([...ring, ring[0]], ROOF.smooth).slice(0, -1);
    const eave = smooth.length >= 3 ? smooth : ring;
    // #194: an about rectangular hall comes to a ridge when it is narrow enough, or always when OSM says gabled.
    const gable = /^gabled?$/.test(String(b.roofShape || "").toLowerCase());
    const rect = kind === "hip" && asRectangle(eave);
    const short = rect && Math.min(Math.hypot(rect[2][0] - rect[1][0], rect[2][1] - rect[1][1]), Math.hypot(rect[0][0] - rect[3][0], rect[0][1] - rect[3][1]));
    if (rect && (gable || short / 2 <= ROOF.maxInset)) {
      if (eave.length === ring.length) return [ridgeRoof(eave, b.h, gable)];
      return [...extrudeRings([ring], b.h, { roof: false }), ridgeRoof(eave, b.h, gable, { walls: false })];
    }
    // #194: an L, T or U hall gets a hipped roof per wing, crossing where the wings meet.
    const boxes = kind === "hip" && !rect && wings(eave);
    if (boxes && boxes.length > 1) return [...extrudeRings([ring], b.h, { roof: false }), ...extrudeRings([eave], 0.01, { walls: false }).map((s) => lift(s, b.h - 0.02)), ...boxes.map((box) => wingRoof(box, b.h))];
    const tiers = roofTiers(eave, kind);
    if (!tiers) return extrudeRings([ring], b.h);
    if (eave.length === ring.length) return extrudeRings([ring], b.h, { tiers });
    return [...extrudeRings([ring], b.h), ...lifted(extrudeRings([eave], 0.01, { walls: false, tiers }), b.h - 0.01)];
  });
}
