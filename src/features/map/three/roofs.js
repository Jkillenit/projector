// Pure: roofs from footprints (#166). Does not import three.
// Shapes use extrudeRings' format, so mergeBuildings draws them in the one building mesh and tapping still works.
import { extrudeRings, inRing, insetRing, pathToRings, ringArea } from "./extrude.js";
import { seedOf, simplify } from "../campusMap.js";

/**
 * Meters. flatOver: footprints past this keep a flat roof (m²); tall: so do towers this high. Slopes go in at most maxInset and rise
 * pitch meters per meter in. smooth: wall jogs smaller than this do not bend the roof. parapet and lip: the light rim of a flat roof.
 */
export const ROOF = { flatOver: 4000, tall: 28, min: 4, maxInset: 6, pitch: 0.55, smooth: 1.5, parapet: 0.9, lip: 0.6, unit: [5, 3.5, 1.8], unitEvery: 1800 };
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
  if (tag) return "hip"; // shortcut: gabled, pyramidal and the rest draw as hipped; add gable ends if a building needs them
  const area = pathToRings(b.path).reduce((s, r) => s + ringArea(r), 0);
  return area > ROOF.flatOver || b.h >= ROOF.tall ? "flat" : "hip";
}

const perimeter = (ring) => ring.reduce((s, p, i) => s + Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1]), 0);

/** Slopes for a ring: [[inset, rise], ...] for extrudeRings, sized to the ring's narrow side, or null when it is too thin or jagged. */
export function roofTiers(ring, kind) {
  const narrow = (2 * ringArea(ring)) / (perimeter(ring) || 1); // about the short side of a long box, half the side of a square
  for (let d = Math.min(ROOF.maxInset, narrow * 0.45); d >= 0.8; d /= 2) {
    if (!insetRing(ring, d)) continue;
    if (kind !== "round") return [[d, d * ROOF.pitch]];
    return STEPS.map((f) => [d * f, d * ROOF.pitch * 1.6 * Math.sin((f * Math.PI) / 2)]);
  }
  return null;
}

const lifted = (shapes, y0, trim) => shapes.map((s) => {
  for (let i = 1; i < s.positions.length; i += 3) s.positions[i] += y0;
  return trim ? Object.assign(s, { uvs: s.uvs.map(() => 0), wallVerts: 0, wallIndices: 0, trim: true }) : s;
});

/** A flat roof: walls up to a light rim, the roof inside it, and a few units on top (seeded by id, never over the edge). */
function flatRoof(ring, h, id) {
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
    const tiers = roofTiers(eave, kind);
    if (!tiers) return extrudeRings([ring], b.h);
    if (eave.length === ring.length) return extrudeRings([ring], b.h, { tiers });
    return [...extrudeRings([ring], b.h), ...lifted(extrudeRings([eave], 0.01, { walls: false, tiers }), b.h - 0.01)];
  });
}
