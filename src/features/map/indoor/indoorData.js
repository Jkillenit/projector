// Pure checks for one building's indoor file. Format: docs/map-3d/indoor-format.md.
import { findBuilding, isOnline, roomOf, toPath } from "../campusMap.js";

// shortcut: entrances and links count as on a walk line within 0.5 m; loosen it if real plans need more.
const ON_WALK_METERS = 0.5;

// A bare file name in the indoor folder: no folders, so a file can never point outside it (#70).
export const PHOTO_FILE = /^[\w-]+\.(jpe?g|png|webp|svg)$/i;

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isRing = (r) => Array.isArray(r) && r.length >= 3 && r.every(isPoint);
const list = (v) => (Array.isArray(v) ? v : []);

function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const onWalk = (p, walk) =>
  walk.some((line) => Array.isArray(line) && line.every(isPoint) &&
    line.slice(1).some((b, i) => distToSegment(p, line[i], b) <= ON_WALK_METERS));

/** Checks an indoor file. Returns { ok, problems } with problems in plain words. */
export function checkIndoor(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, problems: ["This is not a building file"] };
  const problems = [];
  const say = (p) => problems.push(p);

  if (!data.building) say("The building has no id");
  if (!data.name) say("The building has no name");
  if (!isPoint(data.origin)) say("The building's origin is not a point");
  if (data.rotation !== undefined && !Number.isFinite(data.rotation)) say("The building's rotation is not a number");
  if (!(data.floorHeight > 0)) say("The floor height is not more than 0");
  const floors = list(data.floors);
  if (!floors.length) say("The building has no floors");

  const levels = new Set();
  const roomIds = new Set();
  const links = new Map(); // id -> { label, floors }
  let entrances = 0;

  for (const floor of floors) {
    const where = floor?.name || `Floor ${floor?.level}`;
    if (levels.has(floor?.level)) say(`Two floors are level ${floor?.level}`);
    levels.add(floor?.level);
    if (!isRing(floor?.outline)) say(`${where} has no outline`);
    const walk = list(floor?.walk);

    for (const line of walk) {
      if (!Array.isArray(line) || line.length < 2 || !line.every(isPoint)) say(`A walk line on ${where} has under 2 points`);
    }

    for (const room of list(floor?.rooms)) {
      if (!room?.id) { say(`A room on ${where} has no number`); continue; }
      const label = room.name || `Room ${room.id}`;
      if (roomIds.has(room.id)) say(`Room ${room.id} is used twice`);
      roomIds.add(room.id);
      if (!isRing(room.outline)) say(`${label} has no outline`);
      if (!isPoint(room.door)) say(`${label} has no door`);
    }

    for (const e of list(floor?.entrances)) {
      entrances++;
      const label = `Entrance ${e?.name || e?.id}`;
      if (!isPoint(e?.at)) say(`${label} has no place`);
      else if (!onWalk(e.at, walk)) say(`${label} is not on a walk line`);
    }

    for (const link of list(floor?.links)) {
      const label = link?.name || link?.id;
      if (link?.kind !== "stairs" && link?.kind !== "elevator") say(`${label} is not stairs or an elevator`);
      if (!isPoint(link?.at)) say(`${label} has no place on ${where}`);
      else if (!onWalk(link.at, walk)) say(`${label} is not on a walk line on ${where}`);
      const seen = links.get(link?.id) || { label, floors: 0 };
      seen.floors++;
      links.set(link?.id, seen);
    }

    for (const photo of list(floor?.photos)) {
      const label = `Photo ${photo?.file || "with no file"} on ${where}`;
      if (!isPoint(photo?.at)) say(`${label} has no place`);
      else if (!onWalk(photo.at, walk)) say(`${label} is not on a walk line`);
      if (!PHOTO_FILE.test(String(photo?.file || ""))) say(`${label} needs a plain image file name, like turn-1.jpg`);
      if (!String(photo?.alt || "").trim()) say(`${label} has no alt text`);
    }

    for (const mark of list(floor?.landmarks)) {
      if (!mark?.name) say(`A landmark on ${where} has no name`);
      else if (!isPoint(mark.at)) say(`Landmark ${mark.name} has no place`);
    }
  }

  if (floors.length && !entrances) say("The building has no entrance");
  for (const { label, floors: n } of links.values()) if (n < 2) say(`${label} is only on one floor`);

  return { ok: problems.length === 0, problems };
}

/** Plan meters -> campus meters: turn clockwise by rotation degrees around the plan's [0, 0], then add origin. */
export function toCampus([x, y], { origin, rotation = 0 }) {
  const r = (rotation * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return [origin[0] + x * cos - y * sin, origin[1] + x * sin + y * cos];
}

/** The building as a campus.json entry, from its lowest floor's outline: { id, name, alt, c, h, path }. */
export function footprint(data) {
  const ground = [...data.floors].sort((a, b) => a.level - b.level)[0];
  const ring = ground.outline.map((p) => toCampus(p, data));
  const mid = (k) => Math.round(ring.reduce((s, p) => s + p[k], 0) / ring.length);
  return { id: data.building, name: data.name, alt: [], c: [mid(0), mid(1)], h: data.floors.length * data.floorHeight, path: toPath(ring, true) };
}

/**
 * The room a class place points to, in the indoor files we have: { building, floor, room }, or { room: null, reason }.
 * `room` comes first when given (myBama meetings have it); otherwise it is read from the place.
 */
export function findRoom(where, indoor, room) {
  if (isOnline(where)) return { room: null, reason: "This class has no room to walk to" };
  const building = findBuilding(where, indoor);
  if (!building) return { room: null, reason: "We don't have the inside of this building yet" };
  const id = String(room || roomOf(where) || "").trim().toUpperCase();
  if (!id) return { room: null, reason: "We don't know the room number" };
  for (const floor of building.floors) {
    const hit = list(floor.rooms).find((r) => String(r.id).toUpperCase() === id);
    if (hit) return { building, floor, room: hit };
  }
  return { room: null, reason: `We can't find room ${id} in ${building.name}` };
}
