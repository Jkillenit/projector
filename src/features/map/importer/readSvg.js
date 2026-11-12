// Browser only: reads an Inkscape trace with the browser's own DOMParser (no package). The file never leaves the page.
import { parsePathD } from "./planImport.js";

const INK = "http://www.inkscape.org/namespaces/inkscape";
const SODI = "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd";
const SHAPES = "path,line,polyline,polygon,rect,circle,ellipse,text";

const labelOf = (el) => el.getAttributeNS(INK, "label") || el.getAttribute("inkscape:label") || el.getAttribute("id") || "";
const isLayer = (el) => el.tagName === "g" && (el.getAttributeNS(INK, "groupmode") || el.getAttribute("inkscape:groupmode")) === "layer";
const n = (el, a) => Number(el.getAttribute(a) || 0);

/** The element's transforms up to the root, so points land in the root's units. */
function matrixOf(el, root) {
  let m = new DOMMatrix();
  for (let node = el; node && node !== root; node = node.parentNode) {
    const t = node.transform?.baseVal?.consolidate?.();
    if (t) m = DOMMatrix.fromMatrix(t.matrix).multiply(m);
  }
  return m;
}

function shapeOf(el) {
  const tag = el.tagName;
  if (tag === "circle" || tag === "ellipse") return { at: [n(el, "cx"), n(el, "cy")] };
  if (el.getAttributeNS(SODI, "cx") || el.getAttribute("sodipodi:cx")) {
    // Inkscape draws some dots as arc paths; its sodipodi:cx / cy say where the center is.
    return { at: [Number(el.getAttributeNS(SODI, "cx") || el.getAttribute("sodipodi:cx")), Number(el.getAttributeNS(SODI, "cy") || el.getAttribute("sodipodi:cy"))] };
  }
  if (tag === "text") {
    const first = el.querySelector("tspan[x]") || el;
    return { at: [n(first, "x"), n(first, "y")], text: el.textContent };
  }
  if (tag === "line") return { lines: [{ points: [[n(el, "x1"), n(el, "y1")], [n(el, "x2"), n(el, "y2")]], closed: false }] };
  if (tag === "rect") {
    const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => n(el, a));
    return { lines: [{ points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }] };
  }
  if (tag === "polyline" || tag === "polygon") {
    const v = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
    const points = [];
    for (let i = 0; i + 1 < v.length; i += 2) points.push([v[i], v[i + 1]]);
    return { lines: [{ points, closed: tag === "polygon" }] };
  }
  return { lines: parsePathD(el.getAttribute("d")) };
}

/** SVG text to { layers, errors }: layers as svgToIndoor wants them, errors in plain words. Throws if it is not an SVG. */
export function readSvgLayers(text) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.tagName !== "svg") throw new Error("This file is not an SVG we can read.");
  const root = doc.documentElement;
  const errors = [];
  const layers = [...root.querySelectorAll("g")].filter(isLayer).map((g) => {
    const items = [...g.querySelectorAll(SHAPES)]
      .filter((el) => [...ancestors(el)].find(isLayer) === g) // shapes in a sub layer belong to that one
      .flatMap((el) => {
        const label = labelOf(el);
        try {
          const shape = shapeOf(el);
          const m = matrixOf(el, root);
          const move = ([x, y]) => {
            const p = new DOMPoint(x, y).matrixTransform(m);
            return [p.x, p.y];
          };
          return [{ label, ...(shape.at && { at: move(shape.at) }), ...(shape.text && { text: shape.text }), ...(shape.lines && { lines: shape.lines.map((l) => ({ ...l, points: l.points.map(move) })) }) }];
        } catch (e) {
          errors.push(`${label || "A shape"} on ${labelOf(g)}: ${e.message}`);
          return [];
        }
      });
    return { name: labelOf(g), items };
  });
  if (!layers.length) errors.push("No layers found. Put each floor in its own layer named like floor-1.");
  return { layers, errors };
}

function* ancestors(el) {
  for (let p = el.parentNode; p && p.tagName; p = p.parentNode) yield p;
}
