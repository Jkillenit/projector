// Pure: sports fields that look like fields, and Bryant-Denny's bowl (#150). Does not import three.
import { pathToRings } from "./extrude.js";
import { inRing } from "./trees.js";
import { lineToRibbon } from "./campusMesh.js";

/** Which look a field gets from its OSM sport tag (#144). Unknown sports stay plain pitch green. */
const LOOKS = { american_football: "football", soccer: "soccer", baseball: "diamond", softball: "diamond", tennis: "court", pickleball: "court", athletics: "track" };
export const fieldLook = (sport) => LOOKS[sport] || null;

/** Real sizes, meters. A court tile is one tennis court with its run off. A track tile is 8 lanes. */
export const COURT = { length: 36.6, width: 18.3 };
export const TRACK = { lanes: 8 * 1.22, along: 10 };

const centroid = (ring) => ring.reduce(([x, z], p) => [x + p[0] / ring.length, z + p[1] / ring.length], [0, 0]);
const ringArea = (ring) => Math.abs(ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * z, 0)) / 2;
const norm = ([x, z]) => {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
};

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

/** Diamonds: base path length, the texture's size, and how far home sits in from where the foul lines meet, meters. Softball is baseball at 60/90 scale. */
export const DIAMOND = { baseball: { base: 27.43, tile: 130, backstop: 15 }, softball: { base: 18.29, tile: 86.7, backstop: 8 } };
/** Where home plate sits in the diamond texture, as a share of its width. */
export const HOME_U = 5 / 130;

/**
 * Where home plate is and which way center field lies: { home: [x, z], toward: [x, z] (unit), tile }, or null.
 * With an infield ring (OSM often draws the skin), home is behind it, away from the outfield.
 * Without one, the two longest edges are the foul lines: home is where they meet, a little in from the backstop.
 */
export function diamondFrame(ring, infield = null, sport = "baseball") {
  const { base, tile, backstop } = DIAMOND[sport] || DIAMOND.baseball;
  const mid = centroid(ring);
  if (infield) {
    const c = centroid(infield);
    const toward = norm([mid[0] - c[0], mid[1] - c[1]]);
    const back = base / Math.SQRT2; // home to the middle of the diamond
    return { home: [c[0] - toward[0] * back, c[1] - toward[1] * back], toward, tile };
  }
  const len = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [[p, p2], [q, q2]] = ring.map((a, i) => [a, ring[(i + 1) % ring.length]]).sort((e, f) => len(f) - len(e));
  const [r, s] = [[p2[0] - p[0], p2[1] - p[1]], [q2[0] - q[0], q2[1] - q[1]]];
  const cross = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(cross) < 0.3 * Math.hypot(...r) * Math.hypot(...s)) return null; // near parallel: not a fan
  const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / cross;
  const x = [p[0] + r[0] * t, p[1] + r[1] * t];
  const toward = norm([mid[0] - x[0], mid[1] - x[1]]);
  return { home: [x[0] + toward[0] * backstop, x[1] + toward[1] * backstop], toward, tile };
}

/**
 * UVs for flat points [x, y, z, ...] of one field. Football and soccer: the whole texture once over the field's box.
 * Courts and track: one tile per court or per 8 lanes, from the field's edge, so they repeat at real size.
 * Diamonds: real size from home plate, center field toward the right of the texture.
 */
export function fieldUV(positions, frame, look) {
  const uv = new Float32Array((positions.length / 3) * 2);
  if (frame.home) {
    const { home: [hx, hz], toward: [ux, uz], tile } = frame;
    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
      const [x, z] = [positions[i] - hx, positions[i + 2] - hz];
      [uv[j], uv[j + 1]] = [HOME_U + (x * ux + z * uz) / tile, 0.5 + (-x * uz + z * ux) / tile];
    }
    return uv;
  }
  const { center: [cx, cz], along: [ux, uz], length, width } = frame;
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const [x, z] = [positions[i] - cx, positions[i + 2] - cz];
    const [a, c] = [x * ux + z * uz + length / 2, -x * uz + z * ux + width / 2]; // 0 at the field's corner
    if (look === "court") [uv[j], uv[j + 1]] = [a / COURT.length, c / COURT.width];
    else if (look === "track") [uv[j], uv[j + 1]] = [a / TRACK.along, c / TRACK.lanes];
    else [uv[j], uv[j + 1]] = [length ? a / length : 0, width ? c / width : 0];
  }
  return uv;
}

/** A band `w` meters wide just inside a ring, like a warning track along the outfield wall: { positions, indices }, flat at y = 0. */
export function insetBand(ring, w) {
  const n = ring.length;
  const { left, right } = lineToRibbon([ring[n - 1], ...ring, ring[0]], w * 2);
  const [l, r] = [left.slice(1, n + 1), right.slice(1, n + 1)];
  const inner = inRing(centroid([l[0], l[1], ring[1], ring[0]]), ring) ? l : r;
  const positions = [];
  const indices = [];
  ring.forEach((p, i) => {
    positions.push(p[0], 0, p[1], inner[i][0], 0, inner[i][1]);
    const [a, b] = [i * 2, ((i + 1) % n) * 2];
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  });
  return { positions, indices };
}

/** The warning track along a diamond's outfield wall, meters. */
export const WARNING_TRACK = 4.6;

/**
 * Every marked field: [{ look, ring, frame }], or [{ look, shape }] for bands. nature: campus-nature.json (sports by tag, and the track).
 * stadium: a ring; a football field inside it is the stadium's own field (look "stadium").
 * A diamond's inner ring is its infield: it places home plate, and the texture draws the infield.
 */
export function markedFields(nature, { stadium = null } = {}) {
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
      if (look === "diamond") {
        if (rings.some((o) => o !== ring && ringArea(o) > ringArea(ring) && ring.every((p) => inRing(p, o)))) continue; // an infield
        const infield = rings.find((o) => o !== ring && ringArea(o) < ringArea(ring) && o.every((p) => inRing(p, ring)));
        const frame = diamondFrame(ring, infield, sport);
        if (frame) {
          out.push({ look, ring, frame });
          out.push({ look: "dirt", shape: insetBand(ring, WARNING_TRACK) });
          continue;
        }
      }
      add(look === "football" && stadium && inRing(centroid(ring), stadium) ? "stadium" : look, ring);
    }
  }
  for (const ring of pathToRings(nature.track)) add("track", ring);
  return out;
}

/** Bryant-Denny's levels, meters: the wall around the field, lower bowl, suites, upper deck, canopies; and the room around the field. */
export const BOWL = { pad: 2.5, mid: 19, suite: 25, top: 44, roof: 50, end: 22, side: 15, samples: 144 };
/** Parts of the bowl, in the order of its index groups. */
export const BOWL_PARTS = ["seat", "suite", "wall", "pad", "roof", "board"];
/** Seat texture tile, meters: along the rows, and up the stands. */
export const SEATS = { along: 16, up: 8 };

/** The convex hull of a ring, so ramps and stair towers do not make the stands jagged. */
export function hull(ring) {
  const pts = [...ring].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => list.reduce((h, p) => {
    while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
    h.push(p);
    return h;
  }, []);
  return [...half(pts).slice(0, -1), ...half([...pts].reverse()).slice(0, -1)];
}

/** How far a ray from `o` along unit `d` goes before it leaves the ring (its last crossing). */
export function rayOut(ring, [ox, oz], [dx, dz]) {
  let best = 0;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const [ex, ez] = [b[0] - a[0], b[1] - a[1]];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) return;
    const t = ((a[0] - ox) * ez - (a[1] - oz) * ex) / den;
    const u = ((a[0] - ox) * dz - (a[1] - oz) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  });
  return best;
}

/**
 * A stadium bowl that hugs its field, like Bryant-Denny: rays from the field's middle, from a rounded box around the field
 * (`end` meters past the end lines, `side` past the sidelines) out to the stadium's outline.
 * Along each ray: a wall around the field, the lower bowl, a band of suites, the upper deck, the outside wall.
 * Canopies over the sideline upper decks, and a video board at each end.
 * Returns { positions, uvs (seat tiles), groups: { part: indices } } or null when there is no room for stands.
 */
export function stadiumBowl(outer, field, opts = {}) {
  const b = { ...BOWL, ...opts };
  const f = longAxis(field);
  const edge = hull(outer);
  if (!f || !inRing(f.center, edge)) return null;
  const [ux, uz] = f.along;
  const [A, B] = [f.length / 2 + b.end, f.width / 2 + b.side];
  const ring = { in: [], mid: [], out: [], side: [], end: [] };
  for (let i = 0; i < b.samples; i++) {
    const t = (i / b.samples) * Math.PI * 2;
    const [ca, cs] = [Math.cos(t), Math.sin(t)]; // in the field's frame
    const d = [ca * ux - cs * uz, ca * uz + cs * ux];
    const rOut = rayOut(edge, f.center, d);
    const rIn = (Math.abs(ca / A) ** 4 + Math.abs(cs / B) ** 4) ** -0.25; // a rounded box
    if (rOut < rIn + 30) return null;
    const at = (r) => [f.center[0] + d[0] * r, f.center[1] + d[1] * r];
    ring.in.push(at(rIn));
    ring.mid.push(at(rIn + (rOut - rIn) * 0.45));
    ring.out.push(at(rOut));
    ring.side.push(Math.abs(cs) > Math.cos((35 * Math.PI) / 180));
    ring.end.push(ca);
  }
  const positions = [];
  const uvs = [];
  const groups = Object.fromEntries(BOWL_PARTS.map((p) => [p, []]));
  const quad = (part, pts, uv = [0, 0, 0, 0, 0, 0, 0, 0]) => {
    const v = positions.length / 3;
    for (const p of pts) positions.push(...p);
    uvs.push(...uv);
    groups[part].push(v, v + 1, v + 2, v, v + 2, v + 3);
  };
  const y = (p, h) => [p[0], h, p[1]];
  const slope = (p, q, h0, h1) => Math.hypot(q[0] - p[0], q[1] - p[1], h1 - h0) / SEATS.up;
  const n = b.samples;
  let run = 0; // meters along the middle ring, so aisles line up from bottom to top
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [I0, I1, M0, M1, O0, O1] = [ring.in[i], ring.in[j], ring.mid[i], ring.mid[j], ring.out[i], ring.out[j]];
    const step = Math.hypot(M1[0] - M0[0], M1[1] - M0[1]);
    const [u0, u1] = [run / SEATS.along, (run + step) / SEATS.along];
    run += step;
    quad("pad", [y(I0, 0), y(I1, 0), y(I1, b.pad), y(I0, b.pad)]);
    const lo = slope(I0, M0, b.pad, b.mid);
    quad("seat", [y(I0, b.pad), y(I1, b.pad), y(M1, b.mid), y(M0, b.mid)], [u0, 0, u1, 0, u1, lo, u0, lo]);
    quad("suite", [y(M0, b.mid), y(M1, b.mid), y(M1, b.suite), y(M0, b.suite)]);
    const hi = slope(M0, O0, b.suite, b.top);
    quad("seat", [y(M0, b.suite), y(M1, b.suite), y(O1, b.top), y(O0, b.top)], [u0, 0, u1, 0, u1, hi, u0, hi]);
    quad("wall", [y(O0, b.top), y(O1, b.top), y(O1, 0), y(O0, 0)]);
    if (ring.side[i] && ring.side[j]) {
      const k = (p, q) => [p[0] + (q[0] - p[0]) * 0.6, p[1] + (q[1] - p[1]) * 0.6]; // over the top rows only
      quad("roof", [y(k(M0, O0), b.roof), y(k(M1, O1), b.roof), y(O1, b.roof), y(O0, b.roof)]);
    }
  }
  // Video boards: on the rim at each end, across the field.
  for (const sign of [1, -1]) {
    const i = ring.end.reduce((best, c, k) => (c * sign > ring.end[best] * sign ? k : best), 0);
    const [ox, oz] = ring.out[i];
    const [cx, cz] = [ox - ux * sign * 4, oz - uz * sign * 4];
    const [px, pz] = [-uz * 17, ux * 17]; // half its width
    const [tx, tz] = [ux * 1.5, uz * 1.5]; // half its depth
    const c = [[cx - px - tx, cz - pz - tz], [cx + px - tx, cz + pz - tz], [cx + px + tx, cz + pz + tz], [cx - px + tx, cz - pz + tz]];
    const [h0, h1] = [b.top - 2, b.top + 13];
    c.forEach((p, k) => {
      const q = c[(k + 1) % 4];
      quad("board", [[p[0], h0, p[1]], [q[0], h0, q[1]], [q[0], h1, q[1]], [p[0], h1, p[1]]]);
    });
    quad("board", c.map(([x, z]) => [x, h1, z]));
  }
  return { positions, uvs, groups };
}

/** Does the bowl replace this outline? OSM often draws the stadium as a building too; that plain block would cover the field. */
export function underBowl(path, outer) {
  const [cx, cz] = centroid(outer);
  return pathToRings(path).some((r) => ringArea(r) >= ringArea(outer) * 0.5 && inRing(centroid(r), outer) && inRing([cx, cz], r));
}
