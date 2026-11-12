// Pure: sports fields that look like fields, and Bryant-Denny's bowl (#150). Does not import three.
import { pathToRings } from "./extrude.js";
import { inRing } from "./trees.js";

/** Which look a field gets from its OSM sport tag (#144). Unknown sports stay plain pitch green. */
const LOOKS = { american_football: "football", soccer: "soccer", baseball: "diamond", softball: "diamond", tennis: "court", pickleball: "court", athletics: "track" };
export const fieldLook = (sport) => LOOKS[sport] || null;

/** Real sizes, meters. A court tile is one tennis court with its run off. A track tile is 8 lanes. */
export const COURT = { length: 36.6, width: 18.3 };
export const TRACK = { lanes: 8 * 1.22, along: 10 };

const centroid = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);
const ringArea = (ring) => Math.abs(ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * z, 0)) / 2;

/**
 * The field's long axis from its outline: the smallest box around it, turned to one of its edges.
 * { center: [x, z], along: [x, z] (unit, the long side), length, width }.
 */
export function longAxis(ring) {
  let best = null;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!l) return;
    const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    let [a0, a1, c0, c1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const [x, z] of ring) {
      const [s, t] = [x * ux + z * uz, -x * uz + z * ux];
      [a0, a1, c0, c1] = [Math.min(a0, s), Math.max(a1, s), Math.min(c0, t), Math.max(c1, t)];
    }
    const area = (a1 - a0) * (c1 - c0);
    if (!best || area < best.area - 1e-6) best = { area, ux, uz, a0, a1, c0, c1 };
  });
  if (!best) return null;
  let { ux, uz, a0, a1, c0, c1 } = best;
  if (c1 - c0 > a1 - a0) [ux, uz, a0, a1, c0, c1] = [-uz, ux, c0, c1, -a1, -a0]; // turn so `along` is the long side
  const [s, t] = [(a0 + a1) / 2, (c0 + c1) / 2];
  return { center: [s * ux - t * uz, s * uz + t * ux], along: [ux, uz], length: a1 - a0, width: c1 - c0 };
}

/** Courts side by side make a box longer across the courts than along them: turn the box so whole courts fit best. */
export function courtFrame(frame) {
  const miss = (along, across) => Math.abs(along / COURT.length - Math.max(1, Math.round(along / COURT.length))) + Math.abs(across / COURT.width - Math.max(1, Math.round(across / COURT.width)));
  if (miss(frame.width, frame.length) >= miss(frame.length, frame.width)) return frame;
  const [ux, uz] = frame.along;
  return { ...frame, along: [-uz, ux], length: frame.width, width: frame.length };
}

/**
 * UVs for flat points [x, y, z, ...] of one field. Football, soccer and diamonds: the whole texture once over the field's box.
 * Courts and track: one tile per court or per 8 lanes, from the field's edge, so they repeat at real size.
 */
export function fieldUV(positions, frame, look) {
  const { center: [cx, cz], along: [ux, uz], length, width } = frame;
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const [x, z] = [positions[i] - cx, positions[i + 2] - cz];
    const [a, c] = [x * ux + z * uz + length / 2, -x * uz + z * ux + width / 2]; // 0 at the field's corner
    if (look === "court") [uv[j], uv[j + 1]] = [a / COURT.length, c / COURT.width];
    else if (look === "track") [uv[j], uv[j + 1]] = [a / TRACK.along, c / TRACK.lanes];
    else [uv[j], uv[j + 1]] = [length ? a / length : 0, width ? c / width : 0];
  }
  return uv;
}

/**
 * Every marked field: [{ look, ring, frame }]. nature: campus-nature.json (sports by tag, and the track).
 * A ring inside another ring of a diamond is its infield, so it gets plain dirt.
 */
export function markedFields(nature) {
  const out = [];
  const add = (look, ring) => {
    const frame = longAxis(ring);
    if (frame) out.push({ look, ring, frame: look === "court" ? courtFrame(frame) : frame });
  };
  for (const [sport, d] of Object.entries(nature.sports || {})) {
    const look = fieldLook(sport);
    if (!look) continue;
    const rings = pathToRings(d);
    for (const ring of rings) {
      const inside = look === "diamond" && rings.some((o) => o !== ring && ringArea(o) > ringArea(ring) && ring.every((p) => inRing(p, o)));
      add(inside ? "dirt" : look, ring);
    }
  }
  for (const ring of pathToRings(nature.track)) add("track", ring);
  return out;
}

/** Bryant-Denny: how tall the stands are, and how far down the lowest row sits, meters. */
export const BOWL = { top: 42, low: 3, margin: 8 };

/**
 * A stadium bowl: an outer wall up to `top`, stands sloping down to `low`, and a low inner wall to the field.
 * The inner edge is the outline shrunk toward its middle until it clears the field by `margin` meters.
 * Returns { positions, indices, isSeat: [per vertex] } or null when the field does not fit.
 */
export function stadiumBowl(outer, field, { top = BOWL.top, low = BOWL.low, margin = BOWL.margin } = {}) {
  const [cx, cz] = centroid(outer);
  const [fx, fz] = centroid(field);
  const clear = field.map(([x, z]) => {
    const l = Math.hypot(x - fx, z - fz) || 1;
    return [x + ((x - fx) / l) * margin, z + ((z - fz) / l) * margin];
  });
  const shrink = (k) => outer.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
  let k = 0.3;
  while (k < 0.95 && !clear.every((p) => inRing(p, shrink(k)))) k += 0.01;
  if (k >= 0.95) return null;
  const inner = shrink(k);
  const positions = [];
  const indices = [];
  const isSeat = [];
  const quad = (p, q, r, s, seat) => {
    const v = positions.length / 3;
    positions.push(...p, ...q, ...r, ...s);
    isSeat.push(seat, seat, seat, seat);
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
  };
  outer.forEach((a, i) => {
    const j = (i + 1) % outer.length;
    const [b, ia, ib] = [outer[j], inner[i], inner[j]];
    quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], top, b[1]], [a[0], top, a[1]], false); // outer wall
    quad([a[0], top, a[1]], [b[0], top, b[1]], [ib[0], low, ib[1]], [ia[0], low, ia[1]], true); // stands
    quad([ia[0], low, ia[1]], [ib[0], low, ib[1]], [ib[0], 0, ib[1]], [ia[0], 0, ia[1]], false); // wall to the field
  });
  return { positions, indices, isSeat };
}

/** Does the bowl replace this outline? OSM often draws the stadium as a building too; that plain block would cover the field. */
export function underBowl(path, outer) {
  const [cx, cz] = centroid(outer);
  return pathToRings(path).some((r) => ringArea(r) >= ringArea(outer) * 0.5 && inRing(centroid(r), outer) && inRing([cx, cz], r));
}
