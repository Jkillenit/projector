// Pure indoor routing for one building's indoor file (docs/map-3d/indoor-format.md).

const MERGE_METERS = 0.5;
// Extra cost, in meters of flat walking, for going up or down one floor.
const STAIRS_PER_FLOOR = (floorHeight) => floorHeight * 4;
const ELEVATOR_WAIT = 45;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const list = (v) => (Array.isArray(v) ? v : []);

/** Where p falls on segment a-b: t from 0 to 1, the closest point, and how far p is from it. */
function onSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  const at = [a[0] + t * dx, a[1] + t * dy];
  return { t, at, off: dist(p, at) };
}

/**
 * The building's walk graph: { name, floorHeight, nodes, entrances: [{ entrance, node }], rooms: Map(id -> { room, node }) }.
 * Each node is { id, floor, at, edges: [{ to, meters, cost, kind }], link? }.
 */
export function buildGraph(indoor) {
  const nodes = [];
  const node = (floor, at) => {
    // shortcut: linear search for a nearby node, fine for one building; index by grid if real plans get slow.
    const near = nodes.find((n) => n.floor === floor && dist(n.at, at) <= MERGE_METERS);
    if (near) return near;
    const made = { id: nodes.length, floor, at, edges: [] };
    nodes.push(made);
    return made;
  };
  const join = (a, b, meters, cost, kind) => {
    if (a === b) return;
    a.edges.push({ to: b, meters, cost, kind });
    b.edges.push({ to: a, meters, cost, kind });
  };

  const entrances = [];
  const rooms = new Map();
  const links = new Map(); // id -> [{ link, node, level }]

  for (const floor of list(indoor.floors)) {
    const level = floor.level;
    const segments = list(floor.walk).flatMap((line) => line.slice(1).map((b, i) => [line[i], b]));
    const nearestWalk = (p) => segments.map(([a, b]) => onSegment(p, a, b).at).sort((x, y) => dist(p, x) - dist(p, y))[0];
    const doors = list(floor.rooms).map((room) => ({ room, walkAt: nearestWalk(room.door) }));

    // Every point a hallway must stop at: its own corners, other halls' ends, doors, entrances, stairs and elevators.
    const keys = [
      ...segments.flat(),
      ...doors.map((d) => d.walkAt).filter(Boolean),
      ...list(floor.entrances).map((e) => e.at),
      ...list(floor.links).map((l) => l.at),
    ];
    for (const [a, b] of segments) {
      const stops = keys
        .map((p) => ({ p, ...onSegment(p, a, b) }))
        .filter((s) => s.off <= MERGE_METERS)
        .sort((x, y) => x.t - y.t)
        .map((s) => node(level, s.p));
      stops.slice(1).forEach((n, i) => join(stops[i], n, dist(stops[i].at, n.at), dist(stops[i].at, n.at), "walk"));
    }

    for (const { room, walkAt } of doors) {
      const door = node(level, room.door);
      if (walkAt) join(node(level, walkAt), door, dist(walkAt, room.door), dist(walkAt, room.door), "walk");
      rooms.set(String(room.id).toUpperCase(), { room, node: door });
    }
    for (const entrance of list(floor.entrances)) entrances.push({ entrance, node: node(level, entrance.at) });
    for (const link of list(floor.links)) {
      const n = node(level, link.at);
      n.link = link;
      links.set(link.id, [...(links.get(link.id) || []), { link, node: n, level }]);
    }
  }

  for (const stops of links.values()) {
    stops.sort((a, b) => a.level - b.level);
    stops.slice(1).forEach((s, i) => {
      const floorsApart = s.level - stops[i].level;
      const kind = s.link.kind;
      const cost = kind === "elevator" ? ELEVATOR_WAIT : STAIRS_PER_FLOOR(indoor.floorHeight) * floorsApart;
      join(stops[i].node, s.node, 0, cost, kind); // meters counts flat walking only
    });
  }

  return { name: indoor.name, nodes, entrances, rooms };
}

/**
 * Shortest walk (A*) from an entrance to a room. Default start: the main entrance (a step free one when stepFree).
 * Returns { from, room, points: [{ at, floor, link? }], floors, meters }, or { points: [], reason } in plain words.
 */
export function route(graph, fromEntranceId, toRoomId, { stepFree = false } = {}) {
  const target = graph.rooms.get(String(toRoomId || "").toUpperCase());
  if (!target) return { points: [], reason: `We can't find room ${toRoomId} in ${graph.name}` };
  const label = target.room.name || `Room ${target.room.id}`;

  let start;
  if (fromEntranceId) {
    start = graph.entrances.find((e) => e.entrance.id === fromEntranceId);
    if (!start) return { points: [], reason: "We don't know that door" };
    if (stepFree && !start.entrance.stepFree) return { points: [], reason: `${start.entrance.name || start.entrance.id} is not step free` };
  } else {
    const usable = graph.entrances.filter((e) => !stepFree || e.entrance.stepFree);
    start = usable.find((e) => e.entrance.main) || usable[0];
  }
  const none = { points: [], reason: `No ${stepFree ? "step free " : ""}way to ${label}` };
  if (!start) return none;

  const goal = target.node;
  // Straight line distance never overcosts: every edge costs at least its flat meters.
  const guess = (n) => (n.floor === goal.floor ? dist(n.at, goal.at) : 0);
  const cost = new Map([[start.node, 0]]);
  const came = new Map();
  const open = new Set([start.node]);
  while (open.size) {
    let here = null;
    for (const n of open) if (!here || cost.get(n) + guess(n) < cost.get(here) + guess(here)) here = n;
    if (here === goal) break;
    open.delete(here);
    for (const e of here.edges) {
      if (stepFree && e.kind === "stairs") continue;
      const c = cost.get(here) + e.cost;
      if (c < (cost.get(e.to) ?? Infinity)) {
        cost.set(e.to, c);
        came.set(e.to, { from: here, edge: e });
        open.add(e.to);
      }
    }
  }
  if (!cost.has(goal)) return none;

  const path = [goal];
  let meters = 0;
  for (let n = goal; came.has(n); n = came.get(n).from) {
    meters += came.get(n).edge.meters;
    path.unshift(came.get(n).from);
  }
  const points = path.map((n) => ({ at: n.at, floor: n.floor, ...(n.link && { link: n.link }) }));
  const floors = points.map((p) => p.floor).filter((f, i, all) => f !== all[i - 1]);
  return { from: start.entrance, room: target.room, points, floors, meters };
}
