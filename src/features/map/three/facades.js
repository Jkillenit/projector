// Pure: white trim on campus halls (#167). Does not import three.
// Shapes use extrudeRings' format and are marked trim, so mergeBuildings draws them light in the one building mesh and tapping still works.
import { extrudeRings, pathToRings } from "./extrude.js";
import { roofOf } from "./roofs.js";

/** Meters. cornice: the light band under a sloped roof, out from the wall. column: a portico's columns. pediment: rise per meter of front. */
export const TRIM = {
  cornice: { tall: 0.6, out: 0.35, maxMiter: 2 },
  column: { every: 3.2, out: 2.6, beam: 2.2, sides: 16, min: 4 },
  pediment: 0.16,
  base: { tall: 0.7, out: 0.08 }, // a stone base course at the foot of the wall, like Gorgas's
  belt: { tall: 0.22, out: 0.12, floor: 3.5 }, // a thin line at each floor (3.5 m: the brick tile's floor), clear of the windows
};

/** Walls that are light stone or painted white, when OSM does not say. Checked against photos. */
export const LIGHT_WALLS = { "President's Mansion": "white" };
const STONE = /^(stone|limestone|marble|sandstone|concrete|plaster|stucco)$/;

/**
 * The wall color a building gets: "stone" (light, the trim color), a CSS color from OSM or LIGHT_WALLS, or null for brick.
 * look: { colour, material } from OSM. OSM wins over our list.
 */
export function wallOf(name, look = {}) {
  if (look.colour) return look.colour;
  if (STONE.test(look.material || "")) return "stone";
  return LIGHT_WALLS[name] || null;
}

/** A small seeded change in a brick wall's lightness, 0.9 to 1.08, so the halls are not all the same brick. Fixed per building. */
export function wallShade(id) {
  let h = 2166136261;
  for (const ch of String(id ?? "")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return 0.9 + ((h >>> 0) % 1000) / 1000 * 0.18;
}

/**
 * Halls with a columned front, and the way it faces. "quad": toward the middle of the nearest quad.
 * A compass letter faces that way (n is up the map). span: share of the front wall the portico covers.
 * Add a hall here when its front is checked against a photo; a wrong facing reads worse than none.
 */
export const PORTICOS = {
  "President's Mansion": { facing: "quad", span: 0.55 },
  "Smith Hall": { facing: "quad" },
  "Carmichael Hall": { facing: "quad" },
  "Bidgood Hall": { facing: "quad" },
  "Alston Hall": { facing: "quad" },
  "Farrah Hall": { facing: "n" },
};
const COMPASS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

const area2 = (ring) => ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * z, 0);
export const centroid = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);
export const circle = ([cx, cz], r, n) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n), cz + r * Math.sin((i * 2 * Math.PI) / n)]);
const biggest = (rings) => rings.reduce((big, r) => (Math.abs(area2(r)) > Math.abs(area2(big)) ? r : big));

/** Every vertex light trim: no brick, no windows, counted with the roof so it takes the trim color. */
const asTrim = (s) => Object.assign(s, { uvs: s.uvs.map(() => 0), wallVerts: 0, wallIndices: 0, trim: true });
const lift = (s, y0) => {
  for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
  return s;
};
/** extrudeRings from y0 to y1, all trim. */
export const trimBlock = (ring, y0, y1, { roof = true } = {}) => extrudeRings([ring], y1 - y0, { roof }).map((s) => asTrim(lift(s, y0)));

/**
 * The front wall: of the edges at least `min` meters long that face `dir` (cosine over 0.7), the one furthest that way, so a porch
 * that sticks out wins over a wing set back. When no edge faces it that squarely, the edge that faces it best (cosine over 0.3).
 * dir defaults to south (down the map), which is the Quad side of Gorgas. { a, b, out: [x, z], len }, or null.
 */
export function frontEdge(ring, min = 10, dir = [0, 1]) {
  const turn = Math.sign(area2(ring)) || 1;
  let best = null;
  let loose = null;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < min) return;
    const out = [((b[1] - a[1]) / len) * turn, (-(b[0] - a[0]) / len) * turn];
    const cos = out[0] * dir[0] + out[1] * dir[1];
    const far = ((a[0] + b[0]) / 2) * dir[0] + ((a[1] + b[1]) / 2) * dir[1];
    if (cos > 0.7 && (!best || far > best.far)) best = { a, b, out, len, far };
    if (cos > 0.3 && (!loose || cos > loose.cos)) loose = { a, b, out, len, cos };
  });
  const pick = best || loose;
  return pick && { a: pick.a, b: pick.b, out: pick.out, len: pick.len };
}

/** The ring moved d meters outward, corner for corner. Sharp corners stop at maxMiter times d, so they do not spike. */
export function outsetRing(ring, d, maxMiter = TRIM.cornice.maxMiter) {
  const n = ring.length;
  const turn = Math.sign(area2(ring)) || 1;
  const normals = ring.map((a, i) => {
    const b = ring[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [((b[1] - a[1]) / l) * turn, (-(b[0] - a[0]) / l) * turn]; // points out of the ring
  });
  return ring.map(([x, z], i) => {
    const [n1, n2] = [normals[(i + n - 1) % n], normals[i]];
    const [mx, mz] = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-9) return [x + n2[0] * d, z + n2[1] * d];
    const k = Math.min(d / Math.max((mx * n1[0] + mz * n1[1]) / ml, 1e-6), d * maxMiter) / ml;
    return [x + mx * k, z + mz * k];
  });
}

/** A light band just under the eave, standing a little proud of the brick, with a top that shows from straight above. */
export function cornice(rings, h) {
  const { tall, out } = TRIM.cornice;
  return rings.flatMap((ring) => trimBlock(outsetRing(ring, out), Math.max(0, h - tall), h - 0.01));
}

/**
 * A stone base at the foot of each wall and a thin light line at every floor, each a little proud of the brick.
 * Floors below the roof edge only, and not where the cornice already is.
 */
export function belts(rings, h, { top = h } = {}) {
  const { base, belt } = TRIM;
  return rings.flatMap((ring) => {
    const shapes = trimBlock(outsetRing(ring, base.out), 0, Math.min(base.tall, h / 4), { roof: false });
    for (let y = belt.floor; y + belt.tall < top - 1; y += belt.floor) {
      shapes.push(...trimBlock(outsetRing(ring, belt.out), y - belt.tall / 2, y + belt.tall / 2, { roof: false })); // no top: it would hide inside the wall
    }
    return shapes;
  });
}

/** One flat face, turned so it points along `toward`. pts: 3 or 4 corners [x, y, z]. */
function face(shape, pts, toward) {
  const [a, b, c] = pts;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const order = nrm[0] * toward[0] + nrm[1] * toward[1] + nrm[2] * toward[2] < 0 ? [...pts].reverse() : pts;
  const base = shape.positions.length / 3;
  for (const p of order) shape.positions.push(...p);
  shape.indices.push(base, base + 1, base + 2);
  if (order.length === 4) shape.indices.push(base, base + 2, base + 3);
}

/**
 * A row of light columns under a beam along the front wall, from t0 to t1 meters along it, and a low gable (pediment) over the
 * middle when `pediment` is on. Columns stand `out` meters off the wall, as tall as the wall less the beam.
 */
export function portico(front, h, { t0 = 1, t1 = front.len - 1, pediment = true } = {}) {
  const { every, out, beam, sides } = TRIM.column;
  const { a, b, out: o, len } = front;
  const at = (t, d) => [a[0] + ((b[0] - a[0]) * t) / len + o[0] * d, a[1] + ((b[1] - a[1]) * t) / len + o[1] * d];
  const tall = h - beam;
  const r = Math.min(0.6, Math.max(0.35, 0.3 + tall * 0.02));
  const n = Math.max(4, Math.round((t1 - t0) / every) + 1);
  const shapes = [];
  for (let i = 0; i < n; i++) shapes.push(...trimBlock(circle(at(t0 + ((t1 - t0) * i) / (n - 1), out), r, sides), 0, tall, { roof: false }));
  const deep = out + r + 0.3;
  const [s0, s1] = [t0 - r - 0.3, t1 + r + 0.3];
  const top = h - 0.4;
  shapes.push(...trimBlock([at(s0, 0), at(s1, 0), at(s1, deep), at(s0, deep)], tall, top));
  if (!pediment) return shapes;
  // The gable: a front triangle and two slopes, back into the roof so no gap shows.
  const rise = (s1 - s0) * TRIM.pediment;
  const mid = (s0 + s1) / 2;
  const p3 = ([x, z], y) => [x, y, z];
  const [fl, fr, fa] = [p3(at(s0, deep), top), p3(at(s1, deep), top), p3(at(mid, deep), top + rise)];
  const [bl, br, ba] = [p3(at(s0, -1), top), p3(at(s1, -1), top), p3(at(mid, -1), top + rise)];
  const shape = { positions: [], indices: [] };
  const along = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  face(shape, [fl, fr, fa], [o[0], 0, o[1]]);
  face(shape, [fl, fa, ba, bl], [-along[0] * rise, s1 - mid, -along[1] * rise]);
  face(shape, [fa, fr, br, ba], [along[0] * rise, s1 - mid, along[1] * rise]);
  shapes.push(asTrim({ ...shape, uvs: new Array((shape.positions.length / 3) * 2).fill(0) }));
  return shapes;
}

/** Which way a portico faces: a unit [x, z], or null. quads: [[x, z], ...] middles of the quads, for "quad". */
export function facingOf(spec, ring, quads = []) {
  if (COMPASS[spec?.facing]) return COMPASS[spec.facing];
  if (spec?.facing !== "quad" || !quads.length) return null;
  const c = centroid(ring);
  const q = quads.reduce((best, p) => (Math.hypot(p[0] - c[0], p[1] - c[1]) < Math.hypot(best[0] - c[0], best[1] - c[1]) ? p : best));
  const d = Math.hypot(q[0] - c[0], q[1] - c[1]);
  return d > 0 ? [(q[0] - c[0]) / d, (q[1] - c[1]) / d] : null;
}

/**
 * Trim for a building ({ name, path, h, plain, roofShape }): a stone base and a line at each floor, a cornice under a sloped roof,
 * and a columned front for the halls in PORTICOS. Flat roofs already have a light rim (roofs.js). Plain buildings (decks, the town off campus) get none.
 */
export function facadeShapes(b, quads = []) {
  const rings = pathToRings(b?.path);
  if (!rings.length || !(b.h > 0)) return [];
  if (b.plain) return []; // decks and the town off campus: no trim
  const kind = roofOf(b);
  const sloped = kind === "hip" || kind === "round";
  const shapes = [...belts(rings, b.h, { top: sloped ? b.h - TRIM.cornice.tall : b.h }), ...(sloped ? cornice(rings, b.h) : [])];
  const spec = PORTICOS[b.name];
  const ring = spec && biggest(rings);
  const dir = spec && facingOf(spec, ring, quads);
  const front = dir && frontEdge(ring, 10, dir);
  if (front && b.h - TRIM.column.beam >= TRIM.column.min) {
    const span = Math.min(front.len - 2, Math.max(10, front.len * (spec.span ?? 0.45)));
    const t0 = (front.len - span) / 2;
    shapes.push(...portico(front, b.h, { t0, t1: t0 + span }));
  }
  return shapes;
}
