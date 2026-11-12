# Map design issues

Every issue for the map design push. Scope: [docs/map-design/scope.md](../map-design/scope.md). Keys D00 to D27, milestone "Map design". D18 to D23 come from self review 1, D24 to D27 from the comparison with UA's map ([docs/map-design/review-1.md](../map-design/review-1.md)).

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

**Phase 3: semi-realistic look, and clear the bar set by UA's map** (order matters: data first)
- [ ] #{{D08}} Textures made in code: grass, asphalt, concrete, water, roofs
- [ ] #{{D09}} Buildings that look like UA: brick, windows, roof colors
- [ ] #{{D20}} One OSM rebuild: lawns, campus edge, sports and street names
- [ ] #{{D24}} Campus palette: green campus, dark roads, slate roofs
- [ ] #{{D18}} A real skyline: building heights that vary
- [ ] #{{D10}} Trees: placed from OSM and filled in
- [ ] #{{D11}} Light and shadows, with quality tiers
- [ ] #{{D25}} Sports fields that look like fields
- [ ] #{{D26}} Parking lots with stall lines
- [ ] #{{D27}} Street names

**Phase 4: alive**
- [ ] #{{D12}} Time of day: sun, sky and night lights follow the clock
- [ ] #{{D13}} Ambient motion and a render loop that rests
- [ ] #{{D14}} People and cars on the paths and roads
- [ ] #{{D15}} Seasons and game day dressing

**Polish (from self review 1, `docs/map-design/review-1.md`)**
- [ ] #{{D19}} Textures that hold up at a distance
- [ ] #{{D21}} Names for the buildings students look for
- [ ] #{{D22}} Parking decks and towers without house windows
- [ ] #{{D23}} Bigger class pins on the flat fallback map

**Phase 5: finish**
- [ ] #{{D16}} Phone performance pass
- [ ] #{{D17}} Simple landmark models (could)

## Done means

- [ ] Every Must issue closed. `npm test` and `npm run build` green.
- [ ] In Demo mode, at laptop and phone width: open the map in 2.5D, switch to Map and 3D and back, tap a building, walk to a class. It looks like the same place in every view.
- [ ] Text only mode and the no-WebGL fallback still work.
- [ ] Every CC0 asset is listed in `public/map-assets/CREDITS.md`.
- [ ] Side by side with UA's map at the same framing, light and dark: every row of the bar in `docs/map-design/scope.md` is met.

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

<!-- issue key=D10 labels="map-design,must" milestone="Map design" -->
# Trees: placed from OSM and filled in

## Story

As a student
I want trees on the Quad and along the streets
so that the campus looks green like it really is.

## Priority (MoSCoW)

Must (raised after comparing with UA's map: trees are most of its look)

## Size

M

## Acceptance criteria

- [ ] Simple crowns made in code first (a few lumpy shapes, two or three sizes). CC0 models with three's `GLTFLoader` only if they look clearly better from above; then they go in `public/map-assets/` and `CREDITS.md`.
- [ ] Trees at OSM tree points and along tree rows.
- [ ] Street trees in rows along both sides of campus roads, set back from the curb, skipped at buildings, driveways and parking.
- [ ] Lawns get clusters toward their edges and scattered trees in the middle, the way the Quad looks.
- [ ] At the default 2.5D zoom, campus reads as tree lined, like UA's map (see the bar in `scope.md`).
- [ ] Crown color comes from tokens, so seasons (#{{D15}}) can turn them.
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
- [ ] In Map and 2.5D at the default zoom, every building and tree has a soft shadow, so the view has depth like UA's map. Check this view first.
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
I want Denny Chimes and Gorgas Library's columns to look like themselves
so that I can find my bearings from landmarks.

## Priority (MoSCoW)

Could

## Size

M

## Acceptance criteria

- [ ] Simple shapes made in code (no scanned models): the Denny Chimes tower and Gorgas's front columns. The stadium bowl moved to #{{D25}}.
- [ ] They replace the plain raised outline for those buildings and stay tappable.
- [ ] Phone tier keeps them simple.

## Depends on

#{{D09}}

<!-- issue key=D18 labels="map-design,must" milestone="Map design" -->
# A real skyline: building heights that vary

## Story

As a student
I want buildings to stand at different heights in 3D
so that big halls and small houses look different and I can tell places apart.

Found in self review 1 (`docs/map-design/review-1.md`, item 1).

## Priority (MoSCoW)

Must (shadows and the 2.5D view need real size differences)

## Size

S

## Acceptance criteria

- [ ] OSM `height` and `building:levels` still win.
- [ ] Untagged buildings get a default from their footprint and type: houses and small sheds low, big halls taller, parking decks by their deck count. Today every untagged building is 11 m.
- [ ] Seeded, so heights are the same every visit.
- [ ] Pure, tested: default height from footprint and type.

## Depends on

#{{D09}}

<!-- issue key=D19 labels="map-design,should" milestone="Map design" -->
# Textures that hold up at a distance

## Story

As a student
I want paths and walls to look clean from far away
so that the map is calm to read at the default zoom.

Found in self review 1 (`docs/map-design/review-1.md`, item 2).

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Footpaths do not look dotted in Map and 2.5D at the default zoom (concrete slab joints blur into dashes today).
- [ ] Walls do not turn muddy brown from far away (the dark window glass averages the brick down today).
- [ ] Close up, slabs, bricks and windows still show.
- [ ] Checked in light and dark.

## Depends on

#{{D09}}

<!-- issue key=D20 labels="map-design,must" milestone="Map design" -->
# One OSM rebuild: lawns, campus edge, sports and street names

## Story

As a student
I want the map built from fresh, fuller OpenStreetMap data
so that lawns, the campus edge, sports fields and street names can all show.

Found in self review 1 (`docs/map-design/review-1.md`, item 3) and the comparison with UA's map (`docs/map-design/scope.md`, the bar). One rebuild for all of these, so the data changes once.

## Priority (MoSCoW)

Must. Do first: #{{D24}}, #{{D25}} and #{{D27}} need its data.

## Size

M

## Acceptance criteria

- [ ] Named parks land in the grass layer (`natureLayer` already counts `leisure=park` as grass since #121). The Quad shows the grass texture, not the see-through tint.
- [ ] The campus edge (`amenity=university` outline) is saved, for the green campus ground (#{{D24}}).
- [ ] Sports areas keep their `sport` tag (american_football, baseball, softball, soccer, tennis, ...), and `leisure=track` is saved, for #{{D25}}.
- [ ] Road names are saved with the roads, for #{{D27}}.
- [ ] The Overpass query in `scripts/build-campus-map.mjs` lists the new tags. Pure, tested: the new layer rules.
- [ ] Check the diff: no named building lost, ids used by Demo data still there. `campus.json` (first screen) stays about the same size; the new data goes in `campus-nature.json`.

## Depends on

#{{D08}}

<!-- issue key=D21 labels="map-design,should" milestone="Map design" -->
# Names for the buildings students look for

## Story

As a student
I want classroom buildings and landmarks named first
so that I do not read parking decks and shops before the hall my class is in.

Found in self review 1 (`docs/map-design/review-1.md`, item 4).

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Label rank weighs the kind of place, not only its footprint: buildings with my classes and landmarks first, then academic buildings, then housing, then parking and shops.
- [ ] At the default zoom the Quad's academic buildings are named before nearby parking decks.
- [ ] Pure, tested, in `labels.js`.

## Depends on

#{{D06}}

<!-- issue key=D22 labels="map-design,could" milestone="Map design" -->
# Parking decks and towers without house windows

## Story

As a student
I want parking decks and towers to look like what they are
so that I can tell a deck from a dorm at a glance.

Found in self review 1 (`docs/map-design/review-1.md`, item 5).

## Priority (MoSCoW)

Could

## Size

S

## Acceptance criteria

- [ ] Parking decks get open concrete bands, not brick and windows.
- [ ] Small tall shapes like Denny Chimes get plain brick, no window rows (until #{{D17}} gives it a model).
- [ ] Still one mesh for all buildings, so tapping keeps working.

## Depends on

#{{D09}}

<!-- issue key=D23 labels="map-design,could,a11y" milestone="Map design" -->
# Bigger class pins on the flat fallback map

## Story

As a student without WebGL
I want my class and event pins easy to see on the flat map
so that the fallback still shows me where to go.

Found in self review 1 (`docs/map-design/review-1.md`, item 10).

## Priority (MoSCoW)

Could

## Size

XS

## Acceptance criteria

- [ ] Pins on the SVG map are as easy to spot at the default zoom as the scene's pins (#{{D06}}).
- [ ] They still scale with zoom and do not cover each other.

## Depends on

#{{D07}}

<!-- issue key=D24 labels="map-design,must" milestone="Map design" -->
# Campus palette: green campus, dark roads, slate roofs

## Story

As a student
I want the campus to look green with roads that stand out
so that I can see where campus is and how to get around at a glance.

From the comparison with UA's map (`docs/map-design/scope.md`, the bar).

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Inside the campus edge the ground is lawn (grass texture). Outside it stays plain and quieter, so campus stands out.
- [ ] Roads are dark charcoal and sidewalks and paths light, like a finished map. Roads read at a glance on grass and on plain ground. The contrast test is updated to hold this.
- [ ] Roofs vary: a few slate and gray tones (tokens), picked per building from a fixed seed. OSM `roof:colour` still wins. Tappable and background buildings still look different (#118).
- [ ] The pick color still clears 3 to 1 on every new ground and roof color.
- [ ] Light and dark both checked on screen. The flat SVG fallback gets the same colors.

## Depends on

#{{D20}}

<!-- issue key=D25 labels="map-design,should" milestone="Map design" -->
# Sports fields that look like fields

## Story

As a student
I want the stadium, the fields and the track to look like what they are
so that I can find Bryant-Denny, the rec fields and the track at a glance.

From the comparison with UA's map, and self review 1 item 6 (the stadium is an empty gray oval today).

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Bryant-Denny Stadium: a simple bowl made in code (stands around a green field), tappable as the stadium. Moved here from #{{D17}}.
- [ ] Football and soccer fields: mown stripes and white lines. Baseball and softball: a diamond and infield dirt. Tennis: courts. The track: a red oval with lanes.
- [ ] Picked by the OSM `sport` tag and `leisure=track` (#{{D20}}). Unknown sports stay plain pitch green.
- [ ] Textures made in code, like #121. Pure, tested: which look a field gets from its tags, and the field's long axis from its outline.

## Depends on

#{{D20}}

<!-- issue key=D26 labels="map-design,should" milestone="Map design" -->
# Parking lots with stall lines

## Story

As a student who drives
I want parking lots to show their rows of stalls
so that I can tell a lot from a road or a plaza.

From the comparison with UA's map.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Lots show white stall lines in rows, lined up with the lot's long side.
- [ ] Made in code, no image file. Lines fade out when zoomed far out so lots do not shimmer.
- [ ] Pure, tested: a lot's long axis from its outline.

## Depends on

#{{D09}}

<!-- issue key=D27 labels="map-design,should,a11y" milestone="Map design" -->
# Street names

## Story

As a student
I want to see street names like University Boulevard and Hackberry Lane
so that I can match the map to the signs and to directions people give me.

From the comparison with UA's map.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Main road names show along the road in the scene, readable in every view, and thin out like building names (#{{D06}}).
- [ ] They give way to building names and never cover a pin.
- [ ] Names come from OSM (#{{D20}}). Pure, tested: where a name goes on its road.

## Depends on

#{{D20}}
