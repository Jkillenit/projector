// Pure: a route (from route.js) as short written steps, each with the part of the route it covers.

const TURN_DEGREES = 30; // bends smaller than this are "straight"
const SHORT_METERS = 3; // walks shorter than this are not worth a step
const NEAR_METERS = 3; // landmarks this close to the walk are "past"
const DOOR_METERS = 4; // doors this close to the hall count when we say "the second door"
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
// Plan y points down, so a positive cross means b is to the right of a.
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const angle = (a, b) => (Math.atan2(cross(a, b), a[0] * b[0] + a[1] * b[1]) * 180) / Math.PI;
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Meters to feet, rounded to the nearest 10, at least 10. */
export const feet = (meters) => Math.max(10, Math.round((meters * 3.28084) / 10) * 10);

function segmentDistance(p, a, b) {
  const d = sub(b, a);
  const len2 = d[0] * d[0] + d[1] * d[1];
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / len2)) : 0;
  return { t, off: dist(p, [a[0] + t * d[0], a[1] + t * d[1]]) };
}

/** Straight runs along hall points: [{ points, meters, dir }]. A bend under TURN_DEGREES stays in the same run. */
function runs(points) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const dir = sub(points[i].at, points[i - 1].at);
    const len = Math.hypot(...dir);
    if (len < 0.01) continue;
    const last = out.at(-1);
    if (last && Math.abs(angle(last.dir, dir)) < TURN_DEGREES) {
      last.points.push(points[i]);
      last.meters += len;
      last.dir = dir;
    } else out.push({ points: [points[i - 1], points[i]], meters: len, dir });
  }
  return out;
}

/**
 * Steps for a route: [{ text, points }]. Short sentences (rule 12).
 * Example: "Go in the North door." "Walk straight about 40 feet." "Turn right." "Take Stairs A up to Floor 2."
 */
export function steps(route, indoor) {
  if (!route?.points?.length) return [];
  const floorOf = (level) => indoor.floors.find((f) => f.level === level);
  const floorName = (level) => floorOf(level)?.name || `Floor ${level}`;
  const out = [];
  let carry = []; // points from a step too short to say, handed to the next step
  const say = (text, points) => {
    out.push({ text, points: [...carry, ...points].filter((p, i, a) => p !== a[i - 1]) });
    carry = [];
  };

  const { points, room } = route;
  say(`Go in the ${route.from.name || route.from.id}.`, [points[0]]);

  // Split into legs on one floor, with the link rides between them.
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i < points.length && points[i].floor === points[start].floor) continue;
    const lastLeg = i === points.length;
    const leg = points.slice(start, i);
    const hall = lastLeg ? leg.slice(0, -1) : leg; // the last leg ends with the step from the hall into the room
    const legRuns = runs(hall);
    const level = leg[0].floor;

    legRuns.forEach((run, k) => {
      if (k > 0) {
        say(`Turn ${angle(legRuns[k - 1].dir, run.dir) > 0 ? "right" : "left"}.`, [run.points[0]]);
      }
      if (run.meters < SHORT_METERS) { carry.push(...run.points); return; }
      const mark = (floorOf(level)?.landmarks || [])
        .map((m) => ({ m, off: Math.min(...run.points.slice(1).map((p, j) => segmentDistance(m.at, run.points[j].at, p.at).off)) }))
        .filter((x) => x.off <= NEAR_METERS)
        .sort((a, b) => a.off - b.off)[0];
      const walk = `Walk${start === 0 && k === 0 ? " straight" : ""} about ${feet(run.meters)} feet`;
      say(mark ? `${walk}, past the ${lower(mark.m.name)}.` : `${walk}.`, run.points);
    });

    if (lastLeg) {
      const label = room.name || `Room ${room.id}`;
      const final = legRuns.at(-1);
      const door = leg.at(-1);
      if (!final) { say(`${label} is right here.`, [hall.at(-1), door].filter(Boolean)); break; }
      const a = final.points[0].at, b = final.points.at(-1).at;
      const sideOf = (p) => Math.sign(cross(sub(b, a), sub(p, b)));
      const side = sideOf(door.at);
      const target = segmentDistance(room.door, a, b).t;
      // Doors on the same side along this last stretch, up to and including ours.
      const nth = (floorOf(level)?.rooms || []).filter((r) => {
        const { t, off } = segmentDistance(r.door, a, b);
        return off <= DOOR_METERS && t <= target + 1e-9 && sideOf(r.door) === side;
      }).length;
      const where = side > 0 ? "right" : "left";
      say(ORDINALS[nth - 1] ? `${label} is the ${ORDINALS[nth - 1]} door on your ${where}.` : `${label} is on your ${where}.`, [hall.at(-1), door]);
      break;
    }

    // Ride the link: every point from this floor's link to where the floors stop changing.
    let end = i;
    while (end + 1 < points.length && points[end + 1].floor !== points[end].floor) end++;
    const link = points[i].link || points[i - 1].link;
    const what = link.name && link.name.toLowerCase() !== link.kind ? link.name : `the ${link.kind}`;
    const up = points[end].floor > points[i - 1].floor ? "up" : "down";
    say(`Take ${what} ${up} to ${floorName(points[end].floor)}.`, points.slice(i - 1, end + 1));
    start = end;
    i = end;
  }
  return out;
}
