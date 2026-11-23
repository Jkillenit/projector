// Pure: simple shapes made in code for the landmarks students find their way by (#130). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings can use them in place of a plain block and tapping still works.
import { extrudeRings, pathToRings } from "./extrude.js";
import { flatRoof, ROOF, ridgeRoof, roofedShapes } from "./roofs.js";
import { belts, circle, cornice, frontEdge, TRIM, trimBlock } from "./facades.js";

const PLAIN_U = 0.4; // meters into the brick tile: a strip with bricks and no window, for walls with no windows

const centroid = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);
const scaled = (ring, k) => {
  const [cx, cz] = centroid(ring);
  return ring.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
};

/** extrudeRings from y0 to y1. plain: walls with no windows. */
function block(ring, y0, y1, { roof = true, plain = false } = {}) {
  return extrudeRings([ring], y1 - y0, { roof }).map((s) => {
    for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
    if (plain) for (let v = 0; v < s.wallVerts; v++) s.uvs[v * 2] = PLAIN_U;
    return s;
  });
}

const area = (ring) => ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * z, 0);

export { frontEdge }; // moved to facades.js (#167); kept here for older imports

/**
 * Denny Chimes (#199), from a photo: shares of the full height and of the footprint's width.
 * base: white stone. shaft: brick, narrowing toward the top. band: a white ledge under the belfry. belfry: open, with white posts.
 * cap: three white tiers, each smaller than the last.
 */
export const CHIMES = {
  base: { top: 0.19, lip: 0.21, lipOut: 1.04 },
  shaft: { top: 0.78, bottom: 0.7, taper: 0.88 },
  band: { top: 0.8, size: 0.68 },
  belfry: { top: 0.9, size: 0.64, core: 0.5, post: 0.22, mullion: 0.07 },
  cornice: { top: 0.92, size: 0.7 },
  cap: [[0.95, 0.56], [0.975, 0.42], [1, 0.28]],
};

/** Every vertex at y1 pulled toward the middle by k, so the walls lean in. */
function taper(shapes, ring, y1, k) {
  const [cx, cz] = centroid(ring);
  for (const s of shapes) {
    for (let i = 0; i < s.positions.length; i += 3) {
      if (Math.abs(s.positions[i + 1] - y1) > 1e-6) continue;
      s.positions[i] = cx + (s.positions[i] - cx) * k;
      s.positions[i + 2] = cz + (s.positions[i + 2] - cz) * k;
    }
  }
  return shapes;
}

/** No brick, no trim: drawn in the roof color, for the dark openings of the belfry. */
const dark = (shapes) => shapes.map((s) => Object.assign(s, { uvs: s.uvs.map(() => 0), wallVerts: 0, wallIndices: 0 }));

/** Posts of the open belfry: one at each corner of the ring, and two thin ones along each side, so each side has three openings. */
function belfryPosts(ring, y0, y1, { post, mullion }) {
  const c = centroid(ring);
  const shapes = [];
  ring.forEach((a, i) => {
    shapes.push(...trimBlock(ring.map((q) => [a[0] + (q[0] - a[0]) * post, a[1] + (q[1] - a[1]) * post]), y0, y1, { roof: false }));
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    for (const t of [1 / 3, 2 / 3]) {
      const e = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      let n = [-u[1], u[0]];
      if (n[0] * (c[0] - e[0]) + n[1] * (c[1] - e[1]) < 0) n = [u[1], -u[0]];
      const [w, d] = [len * mullion, len * post * 0.6];
      const m = [[e[0] - (u[0] * w) / 2, e[1] - (u[1] * w) / 2], [e[0] + (u[0] * w) / 2, e[1] + (u[1] * w) / 2]];
      shapes.push(...trimBlock([m[0], m[1], [m[1][0] + n[0] * d, m[1][1] + n[1] * d], [m[0][0] + n[0] * d, m[0][1] + n[1] * d]], y0, y1, { roof: false }));
    }
  });
  return shapes;
}

/** Denny Chimes (#199): a white stone base, a brick shaft that narrows, an open white belfry, a stepped white cap. */
function chimes([ring], h) {
  const { base, shaft, band, belfry, cornice, cap } = CHIMES;
  const at = (k) => scaled(ring, k);
  const shapes = [
    ...trimBlock(ring, 0, h * base.top, { roof: false }),
    ...trimBlock(at(base.lipOut), h * base.top, h * base.lip),
    ...taper(block(at(shaft.bottom), h * base.lip, h * shaft.top, { roof: false, plain: true }), ring, h * shaft.top, shaft.taper),
    ...trimBlock(at(band.size), h * shaft.top, h * band.top),
    ...dark(block(at(belfry.core), h * band.top, h * belfry.top, { roof: false })),
    ...belfryPosts(at(belfry.size), h * band.top, h * belfry.top, belfry),
    ...trimBlock(at(cornice.size), h * belfry.top, h * cornice.top),
  ];
  let y = cornice.top;
  for (const [top, size] of cap) {
    shapes.push(...trimBlock(at(size), h * y, h * top));
    y = top;
  }
  return shapes;
}

/**
 * Gorgas Library (#200), from a photo from the Quad. Meters, or shares of h (the top of the book stacks).
 * porch: footprint points this close to the front wall make the stone center block. stacks: points this close to the back make
 * the book stacks, the tall brick block behind. The wings are what is left on each side: a hipped link next to the center, and an
 * outer pavilion with its gable and round window facing the Quad.
 */
export const GORGAS = {
  porch: 4, stacks: 3,
  eave: 0.6, // the brick wings' eave; the columns reach it too
  center: 0.86, // the stone center block's flat top
  depth: 14, recess: 3.5, pier: 2, // center block: how deep, how far the wall sits back behind the columns, the stone end piers
  podium: 2.6, columns: 8, steps: 6, tread: 0.5, cheek: 1.4,
  pitch: 0.32, // the wings' roofs: low, so each gable reads as a pediment under the center block
  link: 9, // how deep the links between the center and the pavilions are
  window: 1.1, // round window in each gable, at most
};

/** [lowest v, highest v] of a ring in (u, v) cut to u0 to u1, or null when nothing is left. */
export function spanIn(ring, u0, u1) {
  let pts = ring;
  for (const [k, lim] of [[1, u0], [-1, u1]]) {
    const inside = (p) => k * (p[0] - lim) >= 0;
    const kept = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      if (inside(p)) kept.push(p);
      if (inside(p) !== inside(q)) kept.push([lim, p[1] + ((q[1] - p[1]) * (lim - p[0])) / (q[0] - p[0])]);
    });
    pts = kept;
  }
  const vs = pts.map((p) => p[1]);
  return vs.length ? [Math.min(...vs), Math.max(...vs)] : null;
}

/** A flat light shape from corners [x, y, z] around its middle (convex), facing `toward`. Trim. */
function flatTrim(pts, toward) {
  const [a, b, c] = pts;
  const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
  const order = n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] < 0 ? [...pts].reverse() : pts;
  const indices = [];
  for (let i = 1; i < order.length - 1; i++) indices.push(0, i, i + 1);
  return { positions: order.flat(), indices, uvs: new Array(order.length * 2).fill(0), wallVerts: 0, wallIndices: 0, trim: true };
}

/** The parts of Gorgas (#200), each a list of shapes, or null when the footprint is not the shape we expect. */
export function gorgasParts(rings, h, id = "gorgas") {
  const G = GORGAS;
  const ring = rings.reduce((big, r) => (Math.abs(area(r)) > Math.abs(area(big)) ? r : big));
  const front = frontEdge(ring);
  if (!front) return null;
  // A frame on the front wall: u along it, v out toward the Quad (0 is the front wall, the building is at v < 0).
  const m = [(front.a[0] + front.b[0]) / 2, (front.a[1] + front.b[1]) / 2];
  const o = front.out;
  const u = [-o[1], o[0]];
  const loc = ring.map(([x, z]) => [(x - m[0]) * u[0] + (z - m[1]) * u[1], (x - m[0]) * o[0] + (z - m[1]) * o[1]]);
  const world = ([s, t]) => [m[0] + u[0] * s + o[0] * t, m[1] + u[1] * s + o[1] * t];
  const box = (u0, u1, v0, v1) => [[u0, v0], [u0, v1], [u1, v1], [u1, v0]].map(world); // back to front first
  const range = (keep) => {
    const us = loc.filter(keep).map((p) => p[0]);
    return [Math.min(...us), Math.max(...us)];
  };
  const [uMin, uMax] = range(() => true);
  const vMin = Math.min(...loc.map((p) => p[1]));
  const [c0, c1] = range((p) => p[1] > -G.porch);
  const [s0, s1] = range((p) => p[1] < vMin + G.stacks);
  if (!(uMin + 5 < s0 && s0 <= c0 && c1 <= s1 && s1 + 5 < uMax)) return null;
  const [E, C, P] = [h * G.eave, h * G.center, G.podium];

  // Wings: a pavilion at each end, gable to the Quad, and a hipped link to the center.
  const pavSpans = [spanIn(loc, uMin, s0 - 0.5), spanIn(loc, s1 + 0.5, uMax)];
  const pavs = [box(uMin, s0, ...pavSpans[0]), box(s1, uMax, ...pavSpans[1])];
  const linkFront = (a, b, fallback) => (b - a > 1 && spanIn(loc, a, b)?.[1]) || fallback;
  const lf = [linkFront(s0 + 0.5, c0 - 0.5, pavSpans[0][1]), linkFront(c1 + 0.5, s1 - 0.5, pavSpans[1][1])];
  const links = [box(s0 - 4, c0 + 1, lf[0] - G.link, lf[0]), box(c1 - 1, s1 + 4, lf[1] - G.link, lf[1])];
  const brick = [...pavs, ...links];
  const windows = [[uMin, s0, pavSpans[0][1]], [s1, uMax, pavSpans[1][1]]].map(([a, b, vf]) => {
    const rise = ((b - a) / 2) * G.pitch;
    const r = Math.min(G.window, rise * 0.3);
    const [x, z] = world([(a + b) / 2, vf + 0.06]);
    const y = E + rise * 0.4;
    return flatTrim(circle([0, 0], r, 16).map(([du, dy]) => [x + u[0] * du, y + dy, z + u[1] * du]), [o[0], 0, o[1]]);
  });
  const wings = [
    ...pavs.map((r) => ridgeRoof(r, E, [false, true], { pitch: G.pitch })),
    ...links.map((r) => ridgeRoof(r, E, false, { pitch: G.pitch })),
    ...belts(brick, E, { top: E - TRIM.cornice.tall }),
    ...cornice(brick, E),
    ...windows,
  ];

  // The book stacks: plain brick, the tallest part, a flat roof with a light rim like other flat roofs, its top at h.
  const stackBack = spanIn(loc, s0 + 0.5, s1 - 0.5)?.[0] ?? vMin;
  const stacks = flatRoof(box(s0, s1, stackBack, -G.depth + 1), h - ROOF.lip, id);
  for (const s of stacks) {
    for (let v = 0; v < s.wallVerts; v++) s.uvs[v * 2] = PLAIN_U;
    s.flat = true; // a light membrane, not the wings' slate
  }

  // The stone center: a podium, a wall set back in shade behind the columns, a pier at each end, and the attic over it all.
  const center = [
    ...trimBlock(box(c0, c1, -G.depth, 0), 0, P),
    ...dark(block(box(c0 + G.pier, c1 - G.pier, -G.depth, -G.recess), P, E, { roof: false })), // in shade, so the columns stand out
    ...trimBlock(box(c0, c0 + G.pier, -G.depth, 0), P, E, { roof: false }),
    ...trimBlock(box(c1 - G.pier, c1, -G.depth, 0), P, E, { roof: false }),
    ...trimBlock(box(c0, c1, -G.depth, 0), E, C),
    flatTrim(box(c0, c1, -G.recess, 0).map(([x, z]) => [x, E, z]), [0, -1, 0]), // the porch ceiling, seen from the steps
  ];
  const [w0, w1] = [c0 + G.pier, c1 - G.pier];
  const every = (w1 - w0) / G.columns;
  const r = Math.min(0.6, every * 0.18);
  const columns = Array.from({ length: G.columns }, (_, i) =>
    trimBlock(circle(world([w0 + every * (i + 0.5), -G.recess / 2]), r, TRIM.column.sides), P, E, { roof: false }),
  ).flat();
  // Wide steps up to the podium, lowest step furthest out, with a stone cheek block on each side.
  const steps = Array.from({ length: G.steps }, (_, i) => trimBlock(box(w0, w1, -0.01, (G.steps - i) * G.tread), 0, (P * (i + 1)) / G.steps)).flat();
  const run = G.steps * G.tread;
  steps.push(...trimBlock(box(w0 - G.cheek, w0, -0.01, run), 0, P + 0.5), ...trimBlock(box(w1, w1 + G.cheek, -0.01, run), 0, P + 0.5));
  return { wings, stacks, center, columns, steps };
}

/** Gorgas Library (#200): stone center with eight columns and wide steps, brick wings with gables to the Quad, the stacks behind. */
function gorgas(rings, h, place) {
  const parts = gorgasParts(rings, h, place.id);
  return parts ? Object.values(parts).flat() : roofedShapes(place);
}

const MODELS = { "Denny Chimes": chimes, "Amelia Gayle Gorgas Library": gorgas };

/** Shapes for a landmark building ({ name, path, h }), or null to use the plain block. */
export function landmarkShapes(b) {
  const model = MODELS[b?.name];
  const rings = pathToRings(b?.path);
  return model && rings.length && b.h > 0 ? model(rings, b.h, b) : null;
}
