// Pure: simple shapes made in code for the landmarks students find their way by (#130). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings can use them in place of a plain block and tapping still works.
import { extrudeRings, pathToRings } from "./extrude.js";
import { roofedShapes } from "./roofs.js";
import { frontEdge, portico, trimBlock } from "./facades.js";

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

/** Gorgas Library: the building, and a row of light columns under a beam along its whole Quad side (no gable). */
function colonnade(rings, h, place) {
  const front = frontEdge(rings.reduce((big, r) => (Math.abs(area(r)) > Math.abs(area(big)) ? r : big)));
  const shapes = roofedShapes(place);
  return front ? [...shapes, ...portico(front, h, { pediment: false })] : shapes;
}

const MODELS = { "Denny Chimes": chimes, "Amelia Gayle Gorgas Library": colonnade };

/** Shapes for a landmark building ({ name, path, h }), or null to use the plain block. */
export function landmarkShapes(b) {
  const model = MODELS[b?.name];
  const rings = pathToRings(b?.path);
  return model && rings.length && b.h > 0 ? model(rings, b.h, b) : null;
}
