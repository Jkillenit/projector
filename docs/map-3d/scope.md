# Map 3D: walk me to my classroom

Scope for the next map push. Proof of concept first: one building, one route, done well.
Parent: #43 (the ultimate campus map). Map slice owner: Jack. Issues: [docs/issues/next.md](../issues/next.md) (keys M00 to M20).

## What we are building

A student taps a class on the map. The map tilts into 3D and flies to the building. The building opens up floor by floor, and a line walks them from the door to their room, with plain steps beside it ("Go in the north door. Take stairs A up to floor 2. Room 216 is the third door on your left.").

The point is not the 3D. UA already pays Concept3D for a 3D campus map with directions. Our edge is that Projector already knows **your** classes, so it can walk **you** to **your** room the night before, with no searching.

## What we already have

- `campus.json`: 329 named UA buildings, roads and areas from OpenStreetMap, in meters from a fixed origin (`campusMap.js`). Built by hand with `scripts/build-campus-map.mjs`. The app never calls OSM.
- An SVG map with pan and zoom, event pins, a "your day" class layer from myBama, sessions you add, a place panel, and links out to Waze, Google and Apple Maps.
- `findBuilding()` already turns "Bidgood Hall 116" into a building. It throws the room number away. We need to keep it.

## The proof of concept (demo script)

1. Open the map. Tap the 3D button. Buildings rise.
2. Tap a class in "Your day". The camera flies to that building.
3. Tap "Walk me there". The floors pull apart. The route draws from the chosen door to the room.
4. Press play. The camera follows the route. The step list highlights each step.
5. Turn on "Step free". The route switches to the elevator.
6. Turn 3D off. The same steps still work as text.

In Demo mode this runs on **Demo Hall**, a made-up building. With UA's written OK, it also runs on one real building in Live mode on our own computers.

## In scope

- 3D campus view (buildings raised from their outlines) with a 2D / 3D switch.
- Camera fly in to a building.
- One indoor data format, a checker for it, and Demo Hall.
- Route from an entrance to a room, with a step free option.
- Plain steps from a route.
- The walkthrough view, opened from the place panel and from "Your day".
- Text only mode, keyboard use, reduced motion.
- One real building, **only if UA approves** the floor plans.

## Out of scope (for now)

- Live "you are here" inside buildings. GPS does not work well indoors. This is a preview, not live directions.
- Every building on campus.
- AR, VR, or a phone app.
- Students editing maps.
- Copying or scraping UA's Concept3D map or any other map's content.

## How it fits our rules

| Rule | What we do |
|---|---|
| 5. No outside calls | Everything is built in. No map tiles, no map API, no network. 3D comes from our own `campus.json`. |
| 6. Demo mode for demos | Demo Hall is made up. Class demos use it. |
| 8. New packages need agreement | One package: `three`. Decided in its own issue first. |
| 9. Pure logic gets tests | Heights, extrusion, the indoor checker, room lookup, routing and steps are pure and tested. They do not import `three`. |
| 1. Stay in your slice | All new code goes in `src/features/map/` (3D in `map/three/`, indoor in `map/indoor/`). Electron work (loading local indoor files) is a tech lead change. |
| New: indoor data stays off the repo | The repo is public and GitHub Pages is public. Real floor plans, real indoor data and real interior photos never get committed. They load from a local folder in Live mode only. |

## Tech choices

- **three.js only** (`three`, MIT). Camera controls and model loaders come inside it (`three/addons`), so no second package. Loaded with a dynamic `import()` only when 3D opens, the same way `MapScreen` is lazy loaded now, so the 2D map stays fast.
- **Not MapLibre or Mapbox.** They need map tiles or a style from a server (rule 5), and they do not do indoor 3D anyway.
- **Not React Three Fiber** for now. It is nicer to write but adds two or more packages. We can revisit.
- Map meters carry straight over: map `x` is three `x` (east), map `y` is three `z` (south), and three `y` is up.

## Indoor data format (short version)

One JSON file per building. Same meter units as `campus.json`. The full spec is in `indoor-format.md`.

```json
{
  "building": "w123456",
  "name": "Demo Hall",
  "origin": [410, -220],
  "rotation": 12,
  "floorHeight": 4,
  "floors": [
    {
      "level": 1,
      "name": "Floor 1",
      "outline": [[0, 0], [60, 0], [60, 30], [0, 30]],
      "rooms": [{ "id": "116", "name": "Room 116", "outline": [[2, 2], [12, 2], [12, 10], [2, 10]], "door": [7, 10] }],
      "walk": [[[0, 15], [60, 15]]],
      "entrances": [{ "id": "north", "name": "North door", "at": [30, 0], "stepFree": true, "main": true }],
      "links": [{ "id": "stairs-a", "kind": "stairs", "at": [5, 15] }, { "id": "elevator-1", "kind": "elevator", "at": [55, 15] }],
      "landmarks": [{ "name": "Vending machines", "at": [20, 16] }]
    }
  ]
}
```

- `walk` lines are hallway center lines. Their points become the route graph.
- A `link` with the same `id` on two floors joins them (stairs or elevator).
- `landmarks` make the steps easier to follow ("past the vending machines").

## Build order (about 6 weeks)

| Week | Work | Milestone |
|---|---|---|
| 1 | Decide on `three`. Add the indoor data rule. Send the floor plan request to UA. Pick the building. | Ground rules |
| 2 | Keep building heights. Extrusion. 3D campus view. Fly in. | Buildings rise |
| 3 | Indoor format and checker. Demo Hall. Room lookup. | Demo Hall exists |
| 4 | Routing with step free. Plain steps. | Route works as text |
| 5 | Walkthrough view. "Walk me there" buttons. Accessibility check. | **Demo ready (Demo Hall)** |
| 6 | If UA said yes: floor plan importer and local loading, then trace the real building. If not: polish. | Real building (maybe) |
| After class | Photos at each turn. A scanned room. "Preview tomorrow" on Home. | Could |

Week 5 is the line we must hit. Week 6 depends on UA.

## Risks

| Risk | Plan |
|---|---|
| UA says no to floor plans, or takes too long | Demo Hall carries the demo. We ask UA what they are OK with. We do not sketch a real building without their OK. |
| 3D is slow on older laptops or lab PCs | Merge buildings into one mesh. Cap pixel ratio. If WebGL fails, fall back to the 2D map and text steps. |
| Scope creep (photos, scans, every building) | Those are "Could" issues. They wait until the Week 5 demo works. |
| Package size | `three` loads only when 3D opens. The 2D map does not change. |
| Accessibility | Text steps are the real feature. 3D is extra. Every step works without it. |

## Questions for the team

1. Do we agree on `three` (rule 8)? Anyone want React Three Fiber instead?
2. Who sends the floor plan request: Jack, or our instructor on our behalf? (Other schools only take these from faculty.)
3. Which building? Best pick: the one our MIS classes meet in, so the demo room is one the instructor knows.
4. Does anyone want to own a piece (Demo Hall, steps text, accessibility) or does Jack keep the whole map slice?
5. Real building in the class demo: only if UA approves in writing. Agreed?

## Done means

- All "Must" issues closed. `npm test` and `npm run build` green.
- The demo script above runs start to finish in Demo mode, on a laptop and at phone width.
- No real floor plan, indoor file or interior photo anywhere in git history.
