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
 * shortcut: every ring is its own solid, so a courtyard ring becomes a block, not a hole; add holes if a real building needs one.
 */
export function extrudeRings(rings, h, { roof: withRoof = true, walls = true } = {}) {
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
      for (const [x, z] of ring) {
        positions.push(x, h, z);
        uvs.push(x, z);
      }
      for (const i of triangulate(ring)) indices.push(wallVerts + i);
    }
    shapes.push({ positions, indices, uvs, wallVerts, wallIndices });
  }
  return shapes;
}
