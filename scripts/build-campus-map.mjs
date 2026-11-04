/**
 * Builds src/features/map/campus.json from OpenStreetMap data. Run by hand when campus changes; the app never calls OSM.
 *
 * 1. Save the Overpass answer for this query as osm.json (https://overpass-turbo.eu or the API):
 *    [out:json][timeout:120];(way["building"](33.198,-87.562,33.224,-87.522);relation["building"](33.198,-87.562,33.224,-87.522);
 *    way["highway"~"^(primary|secondary|tertiary|residential|unclassified)$"](33.198,-87.562,33.224,-87.522);
 *    way["leisure"~"^(park|pitch|stadium)$"]["name"](33.198,-87.562,33.224,-87.522););out geom;
 * 2. node scripts/build-campus-map.mjs path/to/osm.json
 *
 * Map data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Keep the credit on the map.
 * src/features/map/buildings-extra.json adds aliases ({ name, alt }) or buildings OSM lacks ({ name, alt, lat, lon }).
 */
import { readFileSync, writeFileSync } from "fs";
import { project, simplify, toPath } from "../src/features/map/campusMap.js";

const [input] = process.argv.slice(2);
if (!input) throw new Error("Usage: node scripts/build-campus-map.mjs osm.json");
const osm = JSON.parse(readFileSync(input, "utf8"));
const extra = JSON.parse(readFileSync(new URL("../src/features/map/buildings-extra.json", import.meta.url), "utf8"));

const ring = (geometry) => simplify((geometry || []).map((p) => project(p.lat, p.lon)), 1);
const ringsOf = (e) => (e.type === "way" ? [e.geometry] : (e.members || []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry));
const aliases = (t) =>
  [...new Set(["short_name", "alt_name", "official_name", "loc_name", "old_name"].flatMap((k) => String(t[k] || "").split(";")).map((s) => s.trim()).filter((s) => s && s !== t.name))];

const buildings = [];
const context = [];
const roads = [];
const areas = [];
for (const e of osm.elements) {
  const t = e.tags || {};
  if (t.highway) {
    roads.push(toPath(ring(e.geometry), false));
    continue;
  }
  const rings = ringsOf(e).map(ring).filter((r) => r.length > 2);
  if (!rings.length) continue;
  const path = rings.map((r) => toPath(r, true)).join("");
  const pts = rings.flat();
  const c = [Math.round(pts.reduce((s, p) => s + p[0], 0) / pts.length), Math.round(pts.reduce((s, p) => s + p[1], 0) / pts.length)];
  if (t.leisure) areas.push({ id: `${e.type[0]}${e.id}`, name: t.name.trim(), alt: aliases(t), c, path });
  else if (t.name) {
    buildings.push({ id: `${e.type[0]}${e.id}`, name: t.name.trim(), alt: aliases(t), c, path });
  } else context.push(path);
}

for (const x of extra) {
  const known = [...buildings, ...areas].find((b) => b.name === x.name);
  if (known) known.alt = [...new Set([...known.alt, ...(x.alt || [])])];
  else if (x.lat != null && x.lon != null) buildings.push({ id: `x-${x.name}`, name: x.name, alt: x.alt || [], c: project(x.lat, x.lon).map(Math.round), path: "" });
}

const all = [...buildings.map((b) => b.c), ...areas.flatMap((a) => [...a.path.matchAll(/[ML](-?\d+) (-?\d+)/g)].map((m) => [+m[1], +m[2]]))];
const xs = all.map((p) => p[0]);
const ys = all.map((p) => p[1]);
buildings.sort((a, b) => a.name.localeCompare(b.name));
const out = {
  credit: "Map data © OpenStreetMap contributors",
  creditUrl: "https://www.openstreetmap.org/copyright",
  built: new Date().toISOString().slice(0, 10),
  bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  areas,
  roads: roads.join(""),
  context: context.join(""),
  buildings,
};
const file = new URL("../src/features/map/campus.json", import.meta.url);
writeFileSync(file, JSON.stringify(out));
console.log(`${buildings.length} named buildings, ${context.length} other buildings, ${roads.length} roads, ${areas.length} areas, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
