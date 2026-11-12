/**
 * Builds src/features/map/campus.json (first screen) and campus-nature.json (loads with the 3D scene) from OpenStreetMap data.
 * Run by hand when campus changes; the app never calls OSM.
 *
 * 1. Save the Overpass answer for this query as osm.json (https://overpass-turbo.eu or the API):
 *    [out:json][timeout:180][bbox:33.198,-87.562,33.224,-87.522];(
 *    way["building"];relation["building"];
 *    way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service|footway|path|pedestrian|cycleway|steps)$"];
 *    way["leisure"~"^(park|stadium)$"]["name"];way["leisure"~"^(pitch|track)$"];
 *    way["amenity"="university"];relation["amenity"="university"];
 *    way["natural"~"^(water|wood|scrub|tree_row)$"];relation["natural"~"^(water|wood|scrub)$"];node["natural"="tree"];
 *    way["waterway"~"^(river|riverbank)$"];relation["waterway"="riverbank"];
 *    way["landuse"~"^(grass|forest|meadow)$"];relation["landuse"~"^(grass|forest|meadow)$"];
 *    way["amenity"="parking"];relation["amenity"="parking"];);out geom;
 * 2. node scripts/build-campus-map.mjs path/to/osm.json
 *
 * Map data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Keep the credit on the map.
 * src/features/map/buildings-extra.json adds aliases ({ name, alt }) or buildings OSM lacks ({ name, alt, lat, lon }).
 * Add h (meters) to an entry to fix a height OSM has wrong.
 */
import { readFileSync, writeFileSync } from "fs";
import { buildingLook, heightOf, natureLayer, project, simplify, toPath } from "../src/features/map/campusMap.js";

const [input] = process.argv.slice(2);
if (!input) throw new Error("Usage: node scripts/build-campus-map.mjs osm.json");
const osm = JSON.parse(readFileSync(input, "utf8"));
const extra = JSON.parse(readFileSync(new URL("../src/features/map/buildings-extra.json", import.meta.url), "utf8"));

const MAIN_ROADS = /^(primary|secondary|tertiary|residential|unclassified)$/;
const LINES = new Set(["roads", "paths", "river", "treeRows"]);
const ring = (geometry) => simplify((geometry || []).map((p) => project(p.lat, p.lon)), 1);
const ringsOf = (e) => (e.type === "way" ? [e.geometry] : (e.members || []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry));
const aliases = (t) =>
  [...new Set(["short_name", "alt_name", "official_name", "loc_name", "old_name"].flatMap((k) => String(t[k] || "").split(";")).map((s) => s.trim()).filter((s) => s && s !== t.name))];

const buildings = [];
const context = [];
const roads = [];
const areas = [];
const nature = { campus: [], track: [], water: [], river: [], wood: [], grass: [], parking: [], pitch: [], paths: [], treeRows: [], roads: {}, sports: {}, streets: {}, trees: [], outlines: [], looks: {} };
for (const e of osm.elements) {
  const t = e.tags || {};
  const id = `${e.type[0]}${e.id}`;
  const layer = natureLayer(t);
  if (layer === "trees") {
    if (e.lat != null) nature.trees.push(project(e.lat, e.lon).map(Math.round));
    continue;
  }
  if (LINES.has(layer)) {
    const d = toPath(ring(e.geometry), false);
    if (d.length < 8) continue;
    if (layer === "roads") (nature.roads[t.highway] ||= []).push(d);
    else nature[layer].push(d);
    if (layer === "roads" && t.name) (nature.streets[t.name.trim()] ||= []).push(d); // street labels (#152)
    if (MAIN_ROADS.test(t.highway)) roads.push(d);
    continue;
  }
  const rings = ringsOf(e).map(ring).filter((r) => r.length > 2);
  if (!rings.length) continue;
  const path = rings.map((r) => toPath(r, true)).join("");
  if (layer) nature[layer].push(path);
  if (layer === "pitch" && t.sport) (nature.sports[t.sport.split(";")[0].trim()] ||= []).push(path); // field markings (#150)
  const pts = rings.flat();
  const c = [Math.round(pts.reduce((s, p) => s + p[0], 0) / pts.length), Math.round(pts.reduce((s, p) => s + p[1], 0) / pts.length)];
  const look = buildingLook(t);
  if (t.leisure && t.name) areas.push({ id, name: t.name.trim(), alt: aliases(t), c, path });
  else if (t.building && t.name) {
    buildings.push({ id, name: t.name.trim(), alt: aliases(t), c, h: heightOf(t), path });
    if (look) nature.looks[id] = look;
  } else if (t.building) {
    context.push(path);
    nature.outlines.push({ h: heightOf(t), path, ...look });
  }
}

for (const x of extra) {
  const known = [...buildings, ...areas].find((b) => b.name === x.name);
  if (known) {
    known.alt = [...new Set([...known.alt, ...(x.alt || [])])];
    if (x.h && "h" in known) known.h = Math.round(x.h);
  } else if (x.lat != null && x.lon != null)
    buildings.push({ id: `x-${x.name}`, name: x.name, alt: x.alt || [], c: project(x.lat, x.lon).map(Math.round), h: Math.round(x.h || heightOf({})), path: "" });
}

const all = [...buildings.map((b) => b.c), ...areas.flatMap((a) => [...a.path.matchAll(/[ML](-?\d+) (-?\d+)/g)].map((m) => [+m[1], +m[2]]))];
const xs = all.map((p) => p[0]);
const ys = all.map((p) => p[1]);
buildings.sort((a, b) => a.name.localeCompare(b.name));
const credit = { credit: "Map data © OpenStreetMap contributors", creditUrl: "https://www.openstreetmap.org/copyright", built: new Date().toISOString().slice(0, 10) };
const out = { ...credit, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], areas, campus: nature.campus.join(""), roads: roads.join(""), context: context.join(""), buildings };
const save = (name, data) => {
  writeFileSync(new URL(`../src/features/map/${name}`, import.meta.url), JSON.stringify(data));
  return `${(JSON.stringify(data).length / 1024).toFixed(0)} KB`;
};
console.log(`campus.json: ${buildings.length} named buildings, ${context.length} other buildings, ${roads.length} roads, ${areas.length} areas, ${save("campus.json", out)}`);

// Shapes of one layer join into one path string, like campus.json's roads and context.
const SHAPES = ["campus", "water", "river", "wood", "grass", "parking", "pitch", "track", "paths", "treeRows"];
const joined = { ...nature, ...Object.fromEntries(SHAPES.map((k) => [k, nature[k].join("")])) };
for (const k of ["roads", "sports", "streets"]) joined[k] = Object.fromEntries(Object.entries(nature[k]).map(([g, v]) => [g, v.join("")]));
const size = save("campus-nature.json", { ...credit, ...joined });
const counts = [...SHAPES, "trees", "outlines"].map((k) => `${nature[k].length} ${k}`);
const roadCounts = Object.entries({ ...nature.roads, ...nature.sports }).map(([k, v]) => `${v.length} ${k}`);
const colored = [...Object.values(nature.looks), ...nature.outlines].filter((l) => l.colour || l.roof).length;
console.log(`campus-nature.json: ${counts.join(", ")}; roads and sports ${roadCounts.join(", ")}; ${Object.keys(nature.streets).length} street names; ${Object.keys(nature.looks).length} named buildings with a look, ${colored} buildings with a color; ${size}`);
