// Pure math for the 3D map. Does not import three: the view turns these arrays into meshes.
// Axes: map x -> 3D x, map y -> 3D z, up is 3D y.

/** "M1 2L3 4L5 6Z M..." -> [[[1,2],[3,4],[5,6]], ...]. Bad or short rings are dropped. */
export function pathToRings(d) {
  if (typeof d !== "string") return [];
  const rings = [];
  for (const seg of d.split("M").slice(1)) {
    const nums = (seg.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (nums.length % 2 || /[^LZ\d.\s-]/.test(seg)) continue;
    const ring = [];
    for (let i = 0; i < nums.length; i += 2) ring.push([nums[i], nums[i + 1]]);
    const [f, l] = [ring[0], ring[ring.length - 1]];
    if (ring.length > 1 && f[0] === l[0] && f[1] === l[1]) ring.pop();
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area2 = (ring) => ring.reduce((s, p, i) => s + cross([0, 0], p, ring[(i + 1) % ring.length]), 0);
/** A ring's area, m². */
export const ringArea = (ring) => Math.abs(area2(ring)) / 2;

/** Is [x, y] inside the ring (even-odd)? */
export function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

/**
 * The ring moved `d` meters inward, corner for corner (mitered), for roof slopes (#166).
 * null when the ring is too thin or too jagged for it: a corner would land closer than d to a wall, or an edge would flip.
 */
export function insetRing(ring, d) {
  const n = ring?.length;
  const turn = Math.sign(area2(ring || []));
  if (!(n >= 3) || !turn || !(d > 0)) return null;
  const normals = [];
  for (let i = 0; i < n; i++) {
    const [a, b] = [ring[i], ring[(i + 1) % n]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!l) return null;
    normals.push([(-(b[1] - a[1]) / l) * turn, ((b[0] - a[0]) / l) * turn]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const [n1, n2] = [normals[(i + n - 1) % n], normals[i]];
    const [mx, my] = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) return null; // the wall turns straight back
    const k = d / Math.max((mx * n1[0] + my * n1[1]) / ml, 0.5) / ml;
    out.push([ring[i][0] + mx * k, ring[i][1] + my * k]);
  }
  for (let i = 0; i < n; i++) {
    const [a, b, p, q] = [ring[i], ring[(i + 1) % n], out[i], out[(i + 1) % n]];
    if ((q[0] - p[0]) * (b[0] - a[0]) + (q[1] - p[1]) * (b[1] - a[1]) <= 0) return null;
    if (!inRing(p, ring)) return null;
    for (let j = 0; j < n; j++) if (segDist(p, ring[j], ring[(j + 1) % n]) < d * 0.9) return null;
  }
  return out;
}

// Ear clipping. Ring must have negative area (counter clockwise as seen from above).
function triangulate(ring) {
  const idx = ring.map((_, i) => i);
  const tris = [];
  let guard = idx.length * idx.length;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const [ia, ib, ic] = [idx[(k + idx.length - 1) % idx.length], idx[k], idx[(k + 1) % idx.length]];
      const [a, b, c] = [ring[ia], ring[ib], ring[ic]];
      const turn = cross(a, b, c);
      if (turn === 0) { idx.splice(k, 1); clipped = true; break; } // drop collinear point
      if (turn > 0) continue; // reflex corner
      const blocked = idx.some((j) => j !== ia && j !== ib && j !== ic &&
        cross(a, b, ring[j]) <= 0 && cross(b, c, ring[j]) <= 0 && cross(c, a, ring[j]) <= 0);
      if (blocked) continue;
      tris.push(ia, ib, ic);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // self-crossing outline: keep what we have
  }
  if (idx.length === 3 && cross(ring[idx[0]], ring[idx[1]], ring[idx[2]]) < 0) tris.push(...idx);
  return tris;
}

/**
 * One shape per ring: { positions: [x,y,z,...], indices: [...], uvs: [u,v,...], wallVerts, wallIndices }.
 * Walls come first and get their own corners (for flat shading); the roof sits at height h.
 * UVs are meters: along the wall and up it for walls, x and z for the roof, so textures repeat by real size (#122). roof: false gives walls only, walls: false a flat top only.
 * tiers (#166): [[inset, rise], ...] in meters from the eave. The roof slopes in to each tier in turn and ends in a flat top on the last one
 * the ring has room for. One tier is a hipped roof; a few make a rounded one. Slopes get their own corners, so each one catches the light its own way.
 * shortcut: every ring is its own solid, so a courtyard ring becomes a block, not a hole; add holes if a real building needs one.
 */
export function extrudeRings(rings, h, { roof: withRoof = true, walls = true, tiers = [] } = {}) {
  const shapes = [];
  for (const raw of rings || []) {
    if (!Array.isArray(raw) || raw.length < 3 || !(h > 0)) continue;
    const ring = area2(raw) > 0 ? [...raw].reverse() : raw;
    if (area2(ring) === 0) continue;
    const positions = [];
    const indices = [];
    const uvs = [];
    let run = 0; // meters along the wall so far
    if (walls) ring.forEach(([ax, az], i) => {
      const [bx, bz] = ring[(i + 1) % ring.length];
      const v = positions.length / 3;
      const len = Math.hypot(bx - ax, bz - az);
      positions.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, h, az);
      uvs.push(run, 0, run + len, 0, run + len, h, run, h);
      indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
      run += len;
    });
    const wallVerts = positions.length / 3;
    const wallIndices = indices.length;
    if (withRoof) {
      let [top, y] = [ring, h];
      for (const [inset, rise] of tiers) {
        const next = insetRing(ring, inset);
        if (!next) break;
        top.forEach((a, i) => {
          const [b, c, d] = [top[(i + 1) % top.length], next[(i + 1) % next.length], next[i]];
          const v = positions.length / 3;
          positions.push(a[0], y, a[1], b[0], y, b[1], c[0], h + rise, c[1], d[0], h + rise, d[1]);
          uvs.push(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
          indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
        });
        [top, y] = [next, h + rise];
      }
      const cap = positions.length / 3;
      for (const [x, z] of top) {
        positions.push(x, y, z);
        uvs.push(x, z);
      }
      for (const i of triangulate(top)) indices.push(cap + i);
    }
    shapes.push({ positions, indices, uvs, wallVerts, wallIndices });
  }
  return shapes;
}
