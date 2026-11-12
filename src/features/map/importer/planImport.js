// Pure: an Inkscape floor plan trace (docs/map-3d/tracing.md) to our indoor format (docs/map-3d/indoor-format.md).

const SNAP_METERS = 1.5; // doors in and stairs this close to a walk line are moved onto it
const r2 = (n) => Math.round(n * 100) / 100;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Straight line SVG path data to sub paths: [{ points, closed }]. M L H V Z, upper (absolute) and lower (relative) case.
 * Anything else (curves, arcs) throws, since a trace is straight lines only.
 */
export function parsePathD(d) {
  const tokens = String(d || "").match(/[a-df-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  const out = [];
  let cur = null;
  let pos = [0, 0];
  let start = [0, 0];
  let cmd = null;
  let i = 0;
  const num = () => {
    const n = Number(tokens[i++]);
    if (!Number.isFinite(n)) throw new Error("This path has a number we can't read");
    return n;
  };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) throw new Error("This path does not start with M");
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        const x = num(), y = num();
        pos = rel ? [pos[0] + x, pos[1] + y] : [x, y];
        start = pos;
        cur = { points: [pos], closed: false };
        out.push(cur);
        cmd = rel ? "l" : "L"; // more pairs after a move are lines
        break;
      }
      case "L": {
        const x = num(), y = num();
        pos = rel ? [pos[0] + x, pos[1] + y] : [x, y];
        cur.points.push(pos);
        break;
      }
      case "H": {
        const x = num();
        pos = [rel ? pos[0] + x : x, pos[1]];
        cur.points.push(pos);
        break;
      }
      case "V": {
        const y = num();
        pos = [pos[0], rel ? pos[1] + y : y];
        cur.points.push(pos);
        break;
      }
      case "Z":
        if (cur) cur.closed = true;
        pos = start;
        cmd = null;
        break;
      default:
        throw new Error("Use straight lines only: this path has a curve or arc");
    }
  }
  return out;
}

function nearestOnWalk(p, walk) {
  let best = null;
  for (const line of walk) {
    for (let k = 1; k < line.length; k++) {
      const [a, b] = [line[k - 1], line[k]];
      const d = [b[0] - a[0], b[1] - a[1]];
      const len2 = d[0] * d[0] + d[1] * d[1];
      const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / len2)) : 0;
      const q = [a[0] + t * d[0], a[1] + t * d[1]];
      if (!best || dist(p, q) < dist(p, best)) best = q;
    }
  }
  return best && dist(p, best) <= SNAP_METERS ? best.map(r2) : p;
}

const centroid = (pts) => (pts?.length ? [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] : null);
const ring = (pts) => (pts.length > 1 && dist(pts[0], pts.at(-1)) < 1e-9 ? pts.slice(0, -1) : pts);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Layers read from the SVG ([{ name: "floor-1", items: [{ label, lines?, at?, text? }] }], points in SVG units) plus
 * the building fields ({ building, name, origin, rotation, floorHeight }) to { data, notes }. One `scale-<meters>`
 * line sets the size. Notes say, in plain words, what was skipped. Run checkIndoor on `data` before using it.
 */
export function svgToIndoor(layers, fields) {
  const notes = [];
  const scaleItem = layers.flatMap((l) => l.items).find((it) => /^scale-[\d.]+$/.test(it.label) && it.lines?.[0]?.points.length > 1);
  const pts = scaleItem?.lines[0].points;
  const units = pts ? dist(pts[0], pts.at(-1)) : 0;
  const k = units ? Number(scaleItem.label.slice(6)) / units : 0;
  if (!k) notes.push("No scale line: add a line labeled like scale-10 (its real length in meters)");
  const m = (p) => [r2(p[0] * k), r2(p[1] * k)];

  const floors = [];
  for (const layer of layers) {
    const level = /^floor-(-?\d+)$/.exec(layer.name)?.[1];
    if (level === undefined) {
      notes.push(`Skipped layer ${layer.name}: not named like floor-1`);
      continue;
    }
    const floor = { level: Number(level), name: `Floor ${level}`, outline: [], rooms: [], walk: [], entrances: [], links: [], landmarks: [] };
    const doors = new Map();
    const dots = [];
    for (const it of layer.items) {
      const [word, ...flags] = String(it.label || "").trim().split(/\s+/);
      const lines = (it.lines || []).map((l) => l.points.map(m));
      const at = it.at ? m(it.at) : lines[0] ? centroid(lines[0]).map(r2) : null;
      let hit;
      if (word === "outline" && lines[0]) floor.outline = ring(lines[0]);
      else if (word === "walk") floor.walk.push(...lines.filter((l) => l.length > 1));
      else if ((hit = /^room-(.+)$/.exec(word)) && lines[0]) floor.rooms.push({ id: hit[1], name: `Room ${hit[1]}`, outline: ring(lines[0]) });
      else if ((hit = /^door-(.+)$/.exec(word)) && at) doors.set(hit[1], at);
      else if ((hit = /^entrance-(.+)$/.exec(word)) && at) {
        const f = flags.map((x) => x.toLowerCase().replace("-", ""));
        dots.push(["entrances", { id: hit[1], name: `${cap(hit[1])} door`, at, stepFree: f.includes("stepfree"), main: f.includes("main") }]);
      } else if ((hit = /^(stairs|elevator)-(.+)$/.exec(word)) && at) {
        dots.push(["links", { id: word, name: `${cap(hit[1])} ${hit[2].toUpperCase()}`, kind: hit[1], at }]);
      } else if (word === "landmark" && at && it.text) floor.landmarks.push({ name: it.text.trim(), at });
      else if (!/^scale-/.test(word)) notes.push(`Skipped ${it.label || "a shape with no label"} on ${layer.name}: not a name we know`);
    }
    for (const [list, item] of dots) floor[list].push({ ...item, at: nearestOnWalk(item.at, floor.walk) });
    for (const room of floor.rooms) {
      if (doors.has(room.id)) room.door = doors.get(room.id);
    }
    floors.push(floor);
  }
  floors.sort((a, b) => a.level - b.level);
  const { building, name, origin, rotation = 0, floorHeight } = fields;
  return { data: { building, name, origin, rotation, floorHeight, floors }, notes };
}
