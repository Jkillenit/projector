// Pure: which place names fit on screen (#119). Does not import three. Boxes are screen pixels { x, y, w, h }, top left.
import { pathToRings } from "./extrude.js";

const CHAR = 7; // about one character at 12px
const PAD = 10;
const LINE = 18;
const GAP = 4; // room kept around every label

/** The box a name takes, centered on (x, y). */
export function labelBox(name, x, y) {
  const w = String(name).length * CHAR + PAD;
  return { x: x - w / 2, y: y - LINE / 2, w, h: LINE };
}

/** Ground area of a path in square meters. Bigger places get their names first. */
export function footprint(path) {
  let sum = 0;
  for (const ring of pathToRings(path)) {
    let a = 0;
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      a += p[0] * q[1] - q[0] * p[1];
    });
    sum += Math.abs(a) / 2;
  }
  return sum;
}

const overlaps = (a, b) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;

/**
 * Names that fit: highest rank first, none on top of another, none on a pin (obstacles), none off screen.
 * Zooming out packs places closer together, so fewer names fit. items: [{ id, box, rank }]. Returns a Set of ids.
 */
export function thinLabels(items, obstacles = [], view = { w: Infinity, h: Infinity }) {
  const taken = [...obstacles];
  const shown = new Set();
  for (const it of [...items].sort((a, b) => b.rank - a.rank)) {
    const b = it.box;
    if (b.x < 0 || b.y < 0 || b.x + b.w > view.w || b.y + b.h > view.h) continue;
    if (taken.some((t) => overlaps(b, t))) continue;
    taken.push(b);
    shown.add(it.id);
  }
  return shown;
}
