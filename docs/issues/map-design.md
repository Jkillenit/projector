# Map design issues

Every issue for the map design push. Scope: [docs/map-design/scope.md](../map-design/scope.md). Keys D00 to D17, milestone "Map design".

```
node scripts/create-issues.mjs docs/issues/map-design.md --dry-run
node scripts/create-issues.mjs docs/issues/map-design.md --assignee @me
```

<!-- issue key=D00 labels="map-design,epic" milestone="Map design" -->
# Map design: a campus that looks alive (tracking)

## Story

As a student
I want the campus map to look like the real campus, with grass, trees, water, sun and people
so that I can find my way at a glance and the map feels like a place, not a diagram.

Part of #43. Next to #89. Scope: `docs/map-design/scope.md`.

## Priority (MoSCoW)

Must (phases 1 to 3), Should (phases 4 and 5)

## Size

L (split into the issues below)

## Issues

**Phase 1: fill it in**
- [ ] #{{D01}} Widen the OSM build: nature, paths, parking and building looks
- [ ] #{{D02}} Map color tokens shared by 2D and 3D
- [ ] #{{D03}} Ground in the scene: grass, water, parking, roads with width, footpaths

**Phase 2: one scene, three cameras**
- [ ] #{{D04}} Camera modes: Map, 2.5D and 3D
- [ ] #{{D05}} Tap buildings and areas in the scene
- [ ] #{{D06}} Pins and labels in the scene
- [ ] #{{D07}} The scene becomes the map, SVG is the fallback

**Phase 3: semi-realistic look**
- [ ] #{{D08}} Textures made in code: grass, asphalt, concrete, water, roofs
- [ ] #{{D09}} Buildings that look like UA: brick, windows, roof colors
- [ ] #{{D10}} Trees: placed from OSM and filled in
- [ ] #{{D11}} Light and shadows, with quality tiers

**Phase 4: alive**
- [ ] #{{D12}} Time of day: sun, sky and night lights follow the clock
- [ ] #{{D13}} Ambient motion and a render loop that rests
- [ ] #{{D14}} People and cars on the paths and roads
- [ ] #{{D15}} Seasons and game day dressing

**Phase 5: finish**
- [ ] #{{D16}} Phone performance pass
- [ ] #{{D17}} Simple landmark models (could)

## Done means

- [ ] Every Must issue closed. `npm test` and `npm run build` green.
- [ ] In Demo mode, at laptop and phone width: open the map in 2.5D, switch to Map and 3D and back, tap a building, walk to a class. It looks like the same place in every view.
- [ ] Text only mode and the no-WebGL fallback still work.
- [ ] Every CC0 asset is listed in `public/map-assets/CREDITS.md`.

<!-- issue key=D01 labels="map-design,must" milestone="Map design" -->
# Widen the OSM build: nature, paths, parking and building looks

## Story

As a developer
I want the campus build script to pull water, grass, trees, paths, parking and building colors from OpenStreetMap
so that the map has real things to draw instead of empty space.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] The Overpass query in `scripts/build-campus-map.mjs` adds: `natural=water`, `waterway=riverbank` and the river, `landuse=grass|forest|meadow`, `natural=wood|scrub`, `natural=tree` nodes, `natural=tree_row`, `highway=footway|path|pedestrian|service|cycleway|steps`, `amenity=parking`, unnamed `leisure=pitch`.
- [ ] Buildings keep `building:colour`, `roof:colour`, `roof:shape` and `building:material` when OSM has them.
- [ ] Unnamed buildings become outlines with a default height, not one flat SVG path, so 3D can raise them.
- [ ] Output goes to a new `src/features/map/campus-nature.json`. `campus.json` keeps its current shape, so nothing that uses it breaks.
- [ ] The script prints counts per layer. Note in the PR how many trees and colored buildings OSM had (this sets how much D09 and D10 fill in).
- [ ] vitest for the pure parts (tags to layer, tree nodes to points).
- [ ] OSM credit stays on the map. The app never calls OSM.

## Depends on

None

<!-- issue key=D02 labels="map-design,must" milestone="Map design" -->
# Map color tokens shared by 2D and 3D

## Story

As a student
I want the flat map and the 3D map to use the same colors
so that they look like the same campus.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] `--map-grass`, `--map-wood`, `--map-water`, `--map-road`, `--map-path`, `--map-parking`, `--map-pitch`, `--map-building`, `--map-roof`, `--map-accent` (crimson), `--map-pick` in the shared CSS, for light and dark.
- [ ] The SVG map classes (`.map-area`, `.map-road`, `.map-bldg`, ...) use them.
- [ ] The 3D view reads them through `token()` in `stage.js`. The existing contrast test is extended to them.
- [ ] Picked and hover colors still pass contrast against the ground.

## Depends on

None

<!-- issue key=D03 labels="map-design,must" milestone="Map design" -->
# Ground in the scene: grass, water, parking, roads with width, footpaths

## Story

As a student
I want to see grass, the river, parking lots, roads and footpaths under the buildings
so that I can tell where I can walk and park.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] A ground plane under the whole campus.
- [ ] Grass, woods, water, parking and pitch shapes from `campus-nature.json` drawn as flat layers, slightly apart so they do not flicker.
- [ ] Roads drawn as ribbons with a width by type (primary wider than residential), not thin lines. Footpaths as narrow light ribbons.
- [ ] Unnamed buildings raised to their default height.
- [ ] Pure, tested: line to ribbon (left and right edge points at a width), and layer order.
- [ ] Draw calls stay low: one mesh per layer, not one per shape.

## Depends on

#{{D01}}, #{{D02}}

<!-- issue key=D04 labels="map-design,must" milestone="Map design" -->
# Camera modes: Map, 2.5D and 3D

## Story

As a student
I want to switch between a flat map, a tilted 2.5D map and full 3D
so that I can use whichever is easiest for what I am doing.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Map: flat (orthographic) camera looking straight down. Drag pans, wheel and pinch zoom. Same feel as today's SVG map.
- [ ] 2.5D: the same flat camera tilted about 35 degrees. Pan and zoom, no free spin.
- [ ] 3D: today's orbit camera. Fly to a building (#59) still works.
- [ ] A three way switch replaces the 2D / 3D switch. Switching animates the camera and keeps the same spot in view. Reduced motion jumps instead.
- [ ] Pure, tested: the camera pose for each mode from a center and zoom, and the in between poses.
- [ ] Keyboard: arrow keys pan, + and - zoom, in every mode.

## Depends on

None

<!-- issue key=D05 labels="map-design,must" milestone="Map design" -->
# Tap buildings and areas in the scene

## Story

As a student
I want to tap a building or a park in any view
so that the place panel opens like it does on the flat map today.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Tapping a building or area in Map, 2.5D or 3D selects it and opens the place panel (#33).
- [ ] The picked place uses `--map-pick`. Hover shows a light tint on desktop.
- [ ] A drag is not a tap (same rule as the SVG map today).
- [ ] Areas are tappable, not only buildings.
- [ ] Pure, tested: triangle to place id lookup for areas, like `triOwner` for buildings.

## Depends on

#{{D04}}

<!-- issue key=D06 labels="map-design,must" milestone="Map design" -->
# Pins and labels in the scene

## Story

As a student
I want my classes, sessions and events pinned on every view, with building names that do not crowd each other
so that I can read the map at any zoom.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Event pins, the class layer ("Your day") and my sessions show in every view, in the right spot, and open the same panels.
- [ ] Building names as HTML labels over the scene (three's `CSS2DRenderer`, already in `three/addons`), so they stay sharp and readable by screen readers.
- [ ] Labels thin out as you zoom out: bigger and picked places win. Pure, tested.
- [ ] Labels never hide a pin.

## Depends on

#{{D05}}

<!-- issue key=D07 labels="map-design,must" milestone="Map design" -->
# The scene becomes the map, SVG is the fallback

## Story

As a student
I want the map to open in 2.5D by default
so that I see the good map first without hunting for a switch.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] The map opens in 2.5D. The last chosen view is remembered.
- [ ] No WebGL: the SVG map shows with the new colors, and a short note says why.
- [ ] Text only mode (#69) still works with no scene loaded.
- [ ] three still loads only when the map opens, not on the first screen.
- [ ] Old 2D / 3D switch code is removed, not left beside the new one.

## Depends on

#{{D03}}, #{{D06}}

<!-- issue key=D08 labels="map-design,must" milestone="Map design" -->
# Textures made in code: grass, asphalt, concrete, water, roofs

## Story

As a student
I want the ground to look like grass, asphalt and concrete instead of flat color
so that the map looks like a real place.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Canvas made, tiling textures for grass, asphalt, concrete paths, parking, water and roofs, tinted from the `--map-*` tokens so light and dark both work.
- [ ] Textures repeat by world size, so a big lawn does not look stretched.
- [ ] Made once and reused. No image files for these.
- [ ] Pure, tested: the texture repeat for a shape's size.

## Depends on

#{{D03}}

<!-- issue key=D09 labels="map-design,must" milestone="Map design" -->
# Buildings that look like UA: brick, windows, roof colors

## Story

As a student
I want buildings to look like UA's red brick buildings
so that I can recognize them from the street.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Walls use a CC0 brick texture by default, tinted by `building:colour` when OSM has it.
- [ ] Rows of windows on walls, by floor height. Roofs use `roof:colour` or a default.
- [ ] Named landmarks (Gorgas, Denny Chimes, the Student Center, Bryant-Denny) get a crimson touch so they stand out.
- [ ] Every asset file is in `public/map-assets/` and listed in `public/map-assets/CREDITS.md` (name, source, license).
- [ ] Still one mesh for all buildings, so tapping (#{{D05}}) keeps working.

## Depends on

#{{D08}}

<!-- issue key=D10 labels="map-design,should" milestone="Map design" -->
# Trees: placed from OSM and filled in

## Story

As a student
I want trees on the Quad and along the streets
so that the campus looks green like it really is.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] 2 or 3 CC0 tree models, loaded with three's `GLTFLoader` (no new package). Listed in `CREDITS.md`.
- [ ] Trees at OSM tree points and along tree rows.
- [ ] Woods and big lawns get extra trees from a fixed seed, so every load looks the same. Never on roads, paths, water or buildings.
- [ ] Drawn with `InstancedMesh`: one draw call per model.
- [ ] Pure, tested: seeded placement gives the same points each time and none land inside a building or on a road.

## Depends on

#{{D01}}

<!-- issue key=D11 labels="map-design,must" milestone="Map design" -->
# Light and shadows, with quality tiers

## Story

As a student
I want soft sun and shadows on the campus
so that I can tell building shapes apart at a glance.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Sun shadows from buildings and trees on the ground.
- [ ] A light haze toward the edges so the campus has depth.
- [ ] Quality tiers: High (desktop, shadows on), Low (phone, simple dark patch under each building instead of real shadows, pixel ratio 1). Picked by device. Pure, tested.
- [ ] Dark theme still looks right.

## Depends on

#{{D09}}

<!-- issue key=D12 labels="map-design,should" milestone="Map design" -->
# Time of day: sun, sky and night lights follow the clock

## Story

As a student
I want the map to look like it does outside right now, day or night
so that it feels alive and I know what walking there will be like.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Sun angle and sky color follow the local clock and date for Tuscaloosa.
- [ ] At night: windows glow, street lamps light the paths, the sky goes dark.
- [ ] A small "Preview time" control on the dev screen to check any hour.
- [ ] Pure, tested: sun height and direction for a date and time (noon high in the south, below the horizon at midnight).

## Depends on

#{{D11}}

<!-- issue key=D13 labels="map-design,should,a11y" milestone="Map design" -->
# Ambient motion and a render loop that rests

## Story

As a student
I want small movements on the map, like water and trees
so that it feels alive, without draining my battery.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Water shimmers, trees sway a little, cloud shadows drift slowly, my next class pin pulses.
- [ ] A frame loop that runs only while something moves, and stops when the tab is hidden or the map is off screen.
- [ ] Reduced motion: everything is drawn, nothing moves, and the scene only redraws on change.
- [ ] Phone tier: fewer moving things.

## Depends on

#{{D10}}, #{{D12}}

<!-- issue key=D14 labels="map-design,should,demo" milestone="Map design" -->
# People and cars on the paths and roads

## Story

As a student
I want to see little people on the paths and cars on the roads, busier when classes change
so that the campus looks lived in.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Made up dots or small figures walk along footpaths. Small cars drive along roads.
- [ ] Busier in the minutes around class changes, quiet at night and on weekends.
- [ ] Never live data, never anyone's real location. Same in Demo and Live mode.
- [ ] Drawn with `InstancedMesh`. Phone tier shows fewer.
- [ ] Pure, tested: how many people for a time of day, and moving a point along a path by distance.

## Depends on

#{{D03}}, #{{D13}}

<!-- issue key=D15 labels="map-design,should,demo" milestone="Map design" -->
# Seasons and game day dressing

## Story

As a student
I want the map to show fall leaves in the fall and crimson flags and tents on game days
so that it feels like Alabama right now.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Season by date: tree colors change in fall, bare in winter.
- [ ] Game day: flags, tailgate tents on the Quad, crowds near Bryant-Denny. Demo mode uses a made up game schedule in `src/demo/`. Live mode uses the schedule from #37 once it exists.
- [ ] Pure, tested: season for a date, and whether a date is a game day.

## Depends on

#{{D10}}, #{{D14}}

<!-- issue key=D16 labels="map-design,should" milestone="Map design" -->
# Phone performance pass

## Story

As a student on my phone
I want the map to open fast and move smoothly
so that the good looks do not make it hard to use.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] A frame rate meter on the dev screen.
- [ ] Tested on a real phone at phone width in Demo mode. Note the numbers in the PR.
- [ ] Target: about 30 frames a second on a mid range phone, 60 on a laptop.
- [ ] All map assets together under 2 MB. `campus-nature.json` loads only with the scene.
- [ ] Tiers tuned from what you measured.

## Depends on

#{{D15}}

<!-- issue key=D17 labels="map-design,could" milestone="Map design" -->
# Simple landmark models (could)

## Story

As a student
I want Denny Chimes, the Bryant-Denny bowl and Gorgas Library's columns to look like themselves
so that I can find my bearings from landmarks.

## Priority (MoSCoW)

Could

## Size

M

## Acceptance criteria

- [ ] Simple shapes made in code (no scanned models): the Denny Chimes tower, the stadium bowl, Gorgas's front columns.
- [ ] They replace the plain raised outline for those buildings and stay tappable.
- [ ] Phone tier keeps them simple.

## Depends on

#{{D09}}
