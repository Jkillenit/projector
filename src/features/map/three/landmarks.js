// Pure: simple shapes made in code for the landmarks students find their way by (#130). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings can use them in place of a plain block and tapping still works.
import { extrudeRings, pathToRings } from "./extrude.js";
import { roofedShapes } from "./roofs.js";

const PLAIN_U = 0.4; // meters into the brick tile: a strip with bricks and no window, for walls with no windows
const COLUMN = { r: 0.5, every: 3.2, out: 2.6, beam: 2.2, sides: 16 }; // 16 sides: no outline down each column

const centroid = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);
const scaled = (ring, k) => {
  const [cx, cz] = centroid(ring);
  return ring.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
};
const circle = ([cx, cz], r, n) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n), cz + r * Math.sin((i * 2 * Math.PI) / n)]);

/** extrudeRings from y0 to y1. plain: walls with no windows. trim: the whole shape takes the light trim color. */
function block(ring, y0, y1, { roof = true, plain = false, trim = false } = {}) {
  return extrudeRings([ring], y1 - y0, { roof }).map((s) => {
    for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
    if (plain) for (let v = 0; v < s.wallVerts; v++) s.uvs[v * 2] = PLAIN_U;
    if (trim) Object.assign(s, { uvs: s.uvs.map(() => 0), wallVerts: 0, wallIndices: 0, trim: true });
    return s;
  });
}

/** A four sided cap from the ring at y0 up to a point at y1. Counts as roof. */
function pyramid(ring, y0, y1) {
  const r = area(ring) > 0 ? [...ring].reverse() : ring; // same turn as extrudeRings, so faces point out
  const [cx, cz] = centroid(r);
  const positions = [];
  const indices = [];
  const uvs = [];
  r.forEach(([ax, az], i) => {
    const [bx, bz] = r[(i + 1) % r.length];
    const v = positions.length / 3;
    positions.push(ax, y0, az, bx, y0, bz, cx, y1, cz);
    uvs.push(ax, az, bx, bz, cx, cz);
    indices.push(v, v + 1, v + 2);
  });
  return { positions, indices, uvs, wallVerts: 0, wallIndices: 0 };
}
const area = (ring) => ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * z, 0);

/**
 * The front: of the edges at least `min` meters long that face south (toward the Quad for Gorgas), the one furthest south,
 * so a porch that sticks out wins over a wing set back. { a, b, out: [x, z], len }, or null.
 */
export function frontEdge(ring, min = 10) {
  const turn = Math.sign(area(ring)) || 1;
  let best = null;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < min) return;
    const out = [((b[1] - a[1]) / len) * turn, (-(b[0] - a[0]) / len) * turn];
    const z = (a[1] + b[1]) / 2;
    if (out[1] > 0.7 && (!best || z > best.z)) best = { a, b, out, len, z };
  });
  return best;
}

/** Denny Chimes: a plain brick shaft, a wider belfry, a pointed cap. */
function chimes([ring], h) {
  return [...block(ring, 0, h * 0.78, { roof: false, plain: true }), ...block(scaled(ring, 1.18), h * 0.78, h * 0.9, { plain: true }), pyramid(ring, h * 0.9, h)];
}

/** Gorgas Library: the building, and a row of light columns under a beam along its front. */
function colonnade(rings, h, place) {
  const front = frontEdge(rings.reduce((big, r) => (Math.abs(area(r)) > Math.abs(area(big)) ? r : big)));
  const shapes = roofedShapes(place);
  if (!front) return shapes;
  const { a, b, out, len } = front;
  const at = (t, o) => [a[0] + ((b[0] - a[0]) * t) / len + out[0] * o, a[1] + ((b[1] - a[1]) * t) / len + out[1] * o];
  const n = Math.max(2, Math.round(len / COLUMN.every));
  const step = (len - 2) / (n - 1);
  for (let i = 0; i < n; i++) shapes.push(...block(circle(at(1 + i * step, COLUMN.out), COLUMN.r, COLUMN.sides), 0, h - COLUMN.beam, { roof: false, trim: true }));
  const o = COLUMN.out + COLUMN.r + 0.3;
  shapes.push(...block([at(0, 0), at(len, 0), at(len, o), at(0, o)], h - COLUMN.beam, h - 0.4, { trim: true }));
  return shapes;
}

const MODELS = { "Denny Chimes": chimes, "Amelia Gayle Gorgas Library": colonnade };

/** Shapes for a landmark building ({ name, path, h }), or null to use the plain block. */
export function landmarkShapes(b) {
  const model = MODELS[b?.name];
  const rings = pathToRings(b?.path);
  return model && rings.length && b.h > 0 ? model(rings, b.h, b) : null;
}
