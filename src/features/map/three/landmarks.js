// Pure: simple shapes made in code for the landmarks students find their way by (#130). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings can use them in place of a plain block and tapping still works.
import { extrudeRings, pathToRings } from "./extrude.js";
import { roofedShapes } from "./roofs.js";
import { frontEdge, portico } from "./facades.js";

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

export { frontEdge }; // moved to facades.js (#167); kept here for older imports

/** Denny Chimes: a plain brick shaft, a wider belfry, a pointed cap. */
function chimes([ring], h) {
  return [...block(ring, 0, h * 0.78, { roof: false, plain: true }), ...block(scaled(ring, 1.18), h * 0.78, h * 0.9, { plain: true }), pyramid(ring, h * 0.9, h)];
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
