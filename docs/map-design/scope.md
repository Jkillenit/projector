# Map design: a campus that looks alive

Scope for making the campus map look like a real place. Parent: #43 (the ultimate campus map). Sits next to the Map 3D epic (#89). Owner: Jack (tech lead). Tracking: #131. Issues: [docs/issues/map-design.md](../issues/map-design.md) (keys D00 to D17, #114 to #131).

## The problem

The map works but looks like a wireframe. The 2D map is a flat SVG: green areas, one gray road path, gray buildings, all in UI colors. The 3D view raises buildings over a plain background with thin road lines. No ground, water, trees or paths. 2D and 3D look like two different apps.

## What we are building

One campus scene that looks semi-realistic and feels alive, seen three ways:

- **Map**: straight down, flat camera. Pans and zooms like today.
- **2.5D**: the same flat camera tilted about 35 degrees. Walls, trees and shadows show. The default.
- **3D**: free orbit. Fly to a building (#59) and the walkthrough (#67) keep working.

Switching views moves the camera. The scene is never rebuilt, so the three views always match.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Art direction | Semi-realistic | Real campus feel: brick, grass, trees, sun and shadow. |
| How 2D and 2.5D are drawn | One three.js scene, three cameras | Textures and light cannot match between SVG and WebGL. One scene cannot drift. |
| The SVG map | Kept as the no-WebGL fallback and the text only base (#69) | Gets the new colors, not the realism. |
| Textures and models | Mostly made in code, a few CC0 files | Grass, asphalt, concrete, water and roofs are canvas textures. Brick and 2 or 3 tree models are CC0 (Poly Haven, ambientCG, Kenney), loaded with three's built in GLTFLoader. About 1 to 2 MB. No new package (rule 8). |
| "Alive" | Time of day and night, ambient motion, people and cars, seasons and game day | All four, in phase 4. |

## How it fits together

**Data.** `scripts/build-campus-map.mjs` widens its OpenStreetMap query: water, grass and woods, single trees and tree rows, footpaths, parking, pitches, `building:colour` and `roof:*` tags, and unnamed buildings as outlines with a default height. These go in a new `campus-nature.json` that loads only with the scene. `campus.json` stays small for the first screen. The app still never calls OSM, and the OSM credit stays on the map.

**One palette.** `--map-*` tokens (light and dark) feed both the SVG CSS and the three materials through `token()` in `stage.js`.

**Pure logic, tested (rule 9).** Camera math for the three views, label thinning by zoom, seeded tree placement, sun position from the clock, crowd density by time of day, season and game day choice.

**Render loop.** Today the scene redraws only on change. Phase 4 adds a frame loop that pauses when the tab is hidden, when the map is off screen, or under reduced motion. Reduced motion keeps everything drawn, just still.

**Quality tiers.** Desktop: sun shadows, tree sway, full crowd. Phone: simple shadows, fewer dots, pixel ratio 1. Picked by device, and tuned in D16.

**Credits.** `public/map-assets/CREDITS.md` lists every CC0 file and its source.

## Phases

1. **Fill it in**: more OSM layers, map colors, ground in the scene (D01 to D03).
2. **One scene, three cameras**: camera modes, tapping, pins and labels, the scene becomes the map (D04 to D07).
3. **Semi-realistic look**: textures, buildings, trees, light and shadows (D08 to D11).
4. **Alive**: time of day, ambient motion, people and cars, seasons and game day (D12 to D15).
5. **Finish**: phone performance pass, optional landmarks (D16, D17).

Demo cut line: end of phase 3. Phase 4 is what makes it feel alive.

## Rules that apply to every issue

- Demo mode stays fully made up and offline (rule 6). Game days in Demo mode come from a made up schedule.
- No new npm package (rule 8). `three` and its addons are already in.
- Nothing about the student (classes, location, grades) leaves the computer (rules 4 and 5). People and cars are made up, not live data.
- Real floor plans and interior photos stay out of git (rule 14). This epic is outside only.
- Text only mode and keyboard use keep working (#69). Respect reduced motion.

## Out of scope

- Live traffic, live buses, live crowds (#41, #42 own those).
- Real building facades from photos or photogrammetry.
- Indoor visuals (the Map 3D epic owns indoor).

## Risk

OSM coverage of single trees and `building:colour` around UA is not checked yet. If it is thin, D09 and D10 lean on defaults and seeded fill.
