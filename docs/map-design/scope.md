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

## The bar: UA's official campus map

The goal is to beat UA's official online campus map in 2.5D and 3D. It is a hand made illustration, and it does a lot well. We use it as the bar to clear, not as a template: we do not trace or copy its art. Our shapes come from OpenStreetMap and our look is made in code.

**What it does well, and we must match:**

| It has | Issue |
|---|---|
| Campus ground is green; the town outside campus is plain and quiet | #149 |
| Dark roads and white sidewalks that read at a glance | #149 |
| Slate and gray roofs that vary from building to building | #149 |
| Trees everywhere: rows along streets, clusters on lawns, fall color | #123, #128 |
| A soft shadow under every building and tree | #124 |
| Buildings of clearly different sizes | #142 |
| The stadium bowl, striped fields, a red track, a baseball diamond | #150 |
| Parking lots with stall lines | #151 |
| Street names off campus | #152 |
| Hipped, gabled and barrel roofs; white flat roofs with units | #166 |
| White trim, cornices and columned fronts on the landmark halls | #167 |
| Dense, varied trees on the Quad and along streets | #168 |
| A quiet town around campus: plain, low, no windows | #165 |
| Bryant-Denny as it looks from the air: gray decks, crimson blocks, white rim | #164 |
| Pools, fountains, plazas and courts | #170 |

**Where we go past it:** real 3D you can turn, three views of one scene, your classes and sessions pinned, walk me to my classroom, tap and search any place, keyboard and screen reader use, dark mode, and in phase 4 the sun, night lights, people and seasons following the real clock.

**How we check:** at the end of phase 3, take screenshots of our 2.5D and 3D views at the same framing as UA's map, light and dark, and go through the table above. Keep them out of git if they show UA's map (it is not ours to publish).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Art direction | Semi-realistic | Real campus feel: brick, grass, trees, sun and shadow. |
| How 2D and 2.5D are drawn | One three.js scene, three cameras | Textures and light cannot match between SVG and WebGL. One scene cannot drift. |
| The SVG map | Kept as the no-WebGL fallback and the text only base (#69) | Gets the new colors, not the realism. |
| Textures and models | Mostly made in code, a few CC0 files | Grass, asphalt, concrete, water and roofs are canvas textures. Brick and 2 or 3 tree models are CC0 (Poly Haven, ambientCG, Kenney), loaded with three's built in GLTFLoader. About 1 to 2 MB. No new package (rule 8). |
| Flat camera for Map and 2.5D (#117) | One perspective camera with a long 6° lens, not a separate orthographic camera | Looks flat (a 60 m wall leans about 3 m at the edge). One camera means the switch to 3D animates smoothly and the orbit controls, flights and tapping work the same in every view. |
| Brick made in code, not a CC0 file (#122) | One canvas tile: brick courses plus one window per 4 m bay and 3.5 m floor, tinted by `--map-brick` or OSM `building:colour` | Windows line up with floors for free, no download or credits to track, same look offline. Tree models may still be CC0 files. Landmarks get crimson brick (`--map-landmark`), not a crimson roof, so they never look picked. |
| Campus ground (#149) | Green inside the campus edge (OSM `amenity=university`), plain light ground outside | Matches how students see campus: lawns everywhere, town in the background. Keeps the eye on campus. |
| Tappable vs background buildings (#118, #149) | Named buildings get one of three slate roofs (`--map-slate-1` to `-3`, fixed per building), unnamed ones pale gray (`--map-context`) | You can see what you can tap, in the scene and the SVG map. Slate matches UA's roofs. |
| Pick color on roads (#149) | Crimson pick clears 3 to 1 on ground, lawns, lots, sidewalks and every roof, not on roads | Charcoal roads and UA crimson are both dark, so no crimson can clear 3 to 1 on them. No building sits on a road. |
| Untagged heights (#142) | Guessed at build time from footprint and type: sheds 1 level, houses 2, parking decks 3 to 5 decks of 3 m, others 1 to 5 levels by footprint plus one more on about half (seeded by OSM id). OSM `height` and `building:levels` still win. | Most UA buildings have no height tag, so every one was 11 m. A level is 3.5 m, so brick windows still line up by floor. |
| Trees (#123) | Two lumpy low-poly crowns made in code plus a trunk, one `InstancedMesh` each. Placed at OSM trees and rows, in rows along both sides of campus roads (not driveways), in clusters inside lawn edges with a few in the middle, and on a seeded grid in woods. Seeded fill stays inside the map bounds. | No download, no credits, same look offline. Lawn edges full and middles open is how the Quad looks. About 8,000 trees in 3 draw calls; the phone pass (#129) can thin them. |
| Roofs from footprints (#166) | Slopes go in from the eave and end in a flat top along the long side; four slopes for a rounded roof; over 4,000 m² or 28 m tall stays flat with a rim and units. OSM `roof:shape` wins. | Works on any outline with no straight skeleton code. Wall jogs under 1.5 m are smoothed away so they do not bend the roof. Gables draw as hipped for now (#194). |
| How dark the ground can go (#178) | Lawns, lots and roofs stop at a mid tone | The pick color must clear 3 to 1 on every surface a building sits on and every roof (`contrast.test.js`). UA's darker olive and asphalt would fail it. We kept the rule. |
| Shading (#179) | A few lines added to three's Lambert shader through `onBeforeCompile` (`shade.js`), and a soft dark band on the ground around buildings | No new package and no post-processing pass, so it still draws on demand and runs on the Low tier. Screen-space ambient occlusion can come later if a phone can afford it (#129). |
| Fall color (#185) | By date, October 15 to December 5, about half the trees | The map looks like campus does today. Winter and game day stay in #128. |
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
3. **Semi-realistic look, and clear the bar**: one OSM rebuild, the campus palette, textures, buildings, heights, trees, shadows, sports fields, parking, street names (D08 to D11, D18 to D20, D24 to D27). Ends with the side by side check against UA's map.
4. **Alive**: time of day, ambient motion, people and cars, seasons and game day (D12 to D15).
5. **Finish**: phone performance pass, labels and texture polish, optional landmarks (D16, D17, D19, D21 to D23).

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
