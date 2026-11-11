# Next issues

Every new issue for the next push, in our story template. Three groups, each with its own milestone and tracking issue:

| Keys | Milestone | Scope |
|---|---|---|
| M00 to M20 | Map 3D proof of concept | [docs/map-3d/scope.md](../map-3d/scope.md) |
| R00, R02 to R05 | Rename to AL | [docs/al/scope.md](../al/scope.md), part 1 |
| A00 to A12 | AL companion | [docs/al/scope.md](../al/scope.md), part 2 |

Review them here in the PR, then create them on GitHub:

```
node scripts/create-issues.mjs docs/issues/next.md --dry-run
node scripts/create-issues.mjs docs/issues/next.md --assignee @me
```

How the file works: each issue starts at an `<!-- issue key=... labels="..." milestone="..." -->` line, then a `#` title. `{{M07}}` becomes the real number of issue M07. Tracking issues (label `epic`) are created last, once every number is known. Running it twice reuses issues that already exist (same title).

<!-- issue key=M00 labels="map-3d,epic" milestone="Map 3D proof of concept" -->
# Map 3D: walk me to my classroom (tracking)

## Story

As a student
I want to tap my class and see a 3D walk from the building door to my room
so that I know exactly where to go before my first day in a new building.

Part of #43. Scope: `docs/map-3d/scope.md`.

## Priority (MoSCoW)

Must

## Size

L (about 6 weeks, split into the issues below)

## Issues

**Week 1: ground rules**
- [ ] #{{M01}} Decide: add `three` for the 3D map
- [ ] #{{M02}} Rule: real indoor data never goes in the repo
- [ ] #{{M03}} Ask UA for one building's floor plans and pick the building

**Week 2: buildings rise**
- [ ] #{{M04}} Keep building heights in campus.json
- [ ] #{{M05}} Turn building outlines into 3D shapes (pure)
- [ ] #{{M06}} 3D campus view with a 2D / 3D switch
- [ ] #{{M07}} Fly the camera to a building

**Week 3: Demo Hall**
- [ ] #{{M08}} Indoor data format and checker
- [ ] #{{M09}} Demo Hall: a made up building for Demo mode
- [ ] #{{M12}} Find the room in a class location

**Week 4: routes**
- [ ] #{{M13}} Indoor route from a door to a room, with step free
- [ ] #{{M14}} Plain steps from a route

**Week 5: demo ready**
- [ ] #{{M15}} Walkthrough view
- [ ] #{{M16}} "Walk me there" from the place panel and Your day
- [ ] #{{M17}} Text only mode and accessibility check

**Week 6: real building (only if UA approves)**
- [ ] #{{M10}} Floor plan importer (dev screen)
- [ ] #{{M11}} Load real indoor data from this computer in Live mode

**Could (after the demo works)**
- [ ] #{{M18}} A photo at each turn
- [ ] #{{M19}} One scanned room (Gaussian splat)
- [ ] #{{M20}} "Preview tomorrow's walk" on Home

## Done means

- [ ] Every Must issue closed. `npm test` and `npm run build` green.
- [ ] The demo script in the scope doc runs start to finish in Demo mode, at laptop and phone width.
- [ ] No real floor plan, indoor file or interior photo anywhere in git history.

## Traces to interview

Interview #: (fill in) From the 11/11 scope talk. Building on the "can't find my class" pain point, if an interview backs it.

<!-- issue key=M01 labels="map-3d,decision,must" milestone="Map 3D proof of concept" -->
# Decide: add `three` for the 3D map

## Story

As the team
I want to agree on one 3D library before anyone writes 3D code
so that we follow rule 8 and do not end up with two ways to draw 3D.

## Priority (MoSCoW)

Must

## Size

S

## Options

| Option | Packages | Works offline with our campus.json | Indoor 3D | Notes |
|---|---|---|---|---|
| **`three` only (pick this)** | 1 | Yes | Yes | MIT. Camera controls and loaders are inside it (`three/addons`). |
| `three` + React Three Fiber + drei | 3 | Yes | Yes | Nicer React code, but more packages to agree on and update. |
| MapLibre GL | 1 or more | No: needs tiles or a style from a server (rule 5) | No | Good 2.5D maps, but no indoor 3D. |

## Acceptance criteria

- [ ] Team agrees in the PR (rule 8). Two approvals.
- [ ] `three` added to `package.json` at the current version (0.187 as of 11/11), with `^`.
- [ ] Only loaded with a dynamic `import("three")` inside the map slice. Nothing else imports it.
- [ ] `npm run build` shows the 2D map chunk did not grow.
- [ ] Line added to `docs/bmad/decision-log.md`.

## Traces to interview

Interview #: none. Team decision.

<!-- issue key=M02 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Rule: real indoor data never goes in the repo

## Story

As the team
I want a written rule that real floor plans and indoor data stay off the repo
so that we never publish a UA building's layout on our public repo or GitHub Pages.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] New rule in `CLAUDE.md` (rule 14) and `CONTRIBUTING.md`: real floor plans, real indoor data and real interior photos are never committed. They load only from a folder on the student's own computer, in Live mode. Demo mode uses made up buildings only.
- [ ] `.gitignore` covers `indoor-data/`, `*.indoor.json` and `floorplans/`, with a comment on why.
- [ ] Demo Hall's file (#{{M09}}) is named so it is clearly made up and is allowed.
- [ ] Line added to `docs/bmad/decision-log.md`.

## Notes

Floor plans are a campus safety matter. Many schools only release them to staff, or to faculty for a class project. Treat any plan UA gives us as private even if they say yes.

## Traces to interview

Interview #: none. Team rule.

<!-- issue key=M03 labels="map-3d,task,must" milestone="Map 3D proof of concept" -->
# Ask UA for one building's floor plans and pick the building

## Story

As the map owner
I want UA's written OK and a floor plan for one building
so that the real building demo is allowed and accurate.

## Priority (MoSCoW)

Must (send it in week 1; the answer can come later)

## Size

S

## Acceptance criteria

- [ ] Team picks one building and one room. Best pick: the building our MIS classes meet in.
- [ ] Ask our instructor whether they will send the request for us. Other schools only take these from faculty.
- [ ] Request sent to UA (Space Management / campus map team; the campus map contact listed in UA News is `uacampusmap@fa.ua.edu`, confirm it is current).
- [ ] The request says: one building, class project, stays on our own computers, never published, never committed to git, deleted after the class if they want.
- [ ] Answer (yes, no, or what they are OK with) written in this issue. Keep any files they send off the repo (#{{M02}}).
- [ ] If no answer by the end of week 4, we demo with Demo Hall only.

## Draft request

> Hello, our MIS 430 team is building a student app that shows a student the walk from a building's door to their classroom. We would like to try it on one building: [building]. Could we get a floor plan for the floors with classrooms? It would stay on our team's computers, would not be published or put online, and we can delete it when the class ends. If plans are not something you share, is there a way you would be OK with us doing this? Thank you.

## Traces to interview

Interview #: (fill in)

<!-- issue key=M04 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Keep building heights in campus.json

## Story

As a student
I want buildings on the 3D map to be about the right height
so that I can recognize them.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] New pure `heightOf(tags)` in `campusMap.js`: OSM `height` in meters if present, else `building:levels` × 3.5 m, else 3 levels (10.5 m). Ignores bad values.
- [ ] `scripts/build-campus-map.mjs` writes `h` (meters, whole number) on each named building.
- [ ] Unnamed context buildings stay one path string and use a low default height in 3D.
- [ ] `buildings-extra.json` can set `h` by hand to fix a building OSM has wrong.
- [ ] `campus.json` rebuilt. Size grows by only a few KB.
- [ ] vitest for `heightOf`.

## Traces to interview

Interview #: (fill in)

<!-- issue key=M05 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Turn building outlines into 3D shapes (pure)

## Story

As a developer
I want a pure function that turns our SVG outline paths into wall and roof data
so that the 3D view is simple and the math is tested.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] `src/features/map/three/extrude.js` exports `pathToRings(d)` (our `M L Z` paths to point rings) and `extrudeRings(rings, h)` that returns plain arrays (positions, indices). It does **not** import `three`.
- [ ] Map axes carry over: map `x` is 3D `x`, map `y` is 3D `z`, up is `y`.
- [ ] Handles buildings with more than one ring (relations), and skips empty paths (`buildings-extra` entries with no outline).
- [ ] vitest: a square gives 4 walls and a roof with the right counts; a 2 ring path gives 2 shapes; a bad path gives nothing, not a crash.

## Depends on

#{{M04}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M06 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# 3D campus view with a 2D / 3D switch

## Story

As a student
I want to switch the map to 3D
so that I can see campus the way it looks when I walk it.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] A 2D / 3D switch on the map. 2D stays the default and does not change.
- [ ] `src/features/map/three/Campus3D.jsx` loads `three` with a dynamic `import()` only when 3D is turned on. Shows a loading state.
- [ ] Named buildings are merged into as few meshes as possible. Context buildings and roads are drawn low and plain.
- [ ] Orbit, zoom and pan with mouse, touch and keyboard. Tapping a building picks it, same as 2D (place panel opens).
- [ ] Class pins and event pins show in 3D at the same buildings.
- [ ] Colors come from our tokens (read CSS variables), so light and dark themes both work.
- [ ] If WebGL is not available, the switch says so in plain words and stays on 2D.
- [ ] OSM credit still shows.
- [ ] Holds a smooth frame rate on a normal laptop. Pixel ratio capped at 2.

## Depends on

#{{M01}}, #{{M05}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M07 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Fly the camera to a building

## Story

As a student
I want the map to fly to my class's building when I tap the class
so that I can see where it is without hunting.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] Pure `flyPath(from, to, t)` in `three/camera.js`: eased camera position and target for `t` from 0 to 1. vitest for start, end and middle.
- [ ] Tapping a class in Your day, a search result, or `#/map?q=` flies there in 3D (about 1.5 s).
- [ ] With reduced motion on, the camera jumps with no animation.
- [ ] A new tap mid flight starts a new flight from where the camera is.

## Depends on

#{{M06}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M08 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Indoor data format and checker

## Story

As a developer
I want one written format for a building's inside and a checker for it
so that Demo Hall, the importer and real buildings all work the same way.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] `docs/map-3d/indoor-format.md` explains each field (see the short version in the scope doc): `building`, `name`, `origin`, `rotation`, `floorHeight`, and per floor `level`, `name`, `outline`, `rooms` (id, name, outline, door), `walk` lines, `entrances` (id, name, at, stepFree, main), `links` (id, kind stairs or elevator, at), `landmarks`.
- [ ] Units are meters, same as `campus.json`. `origin` and `rotation` place the plan on the campus map.
- [ ] Pure `checkIndoor(data)` in `src/features/map/indoor/indoorData.js` returns `{ ok, problems: [] }` in plain words ("Room 116 has no door", "Stairs A is only on one floor", "Entrance north is not on a walk line").
- [ ] Pure `toCampus(point, data)` turns plan meters into campus meters.
- [ ] vitest for each problem the checker finds and for `toCampus`.

## Traces to interview

Interview #: none. Groundwork.

<!-- issue key=M09 labels="map-3d,demo,must" milestone="Map 3D proof of concept" -->
# Demo Hall: a made up building for Demo mode

## Story

As a teammate giving a demo
I want a made up building with a few floors and rooms
so that we can show the whole walkthrough without any real floor plan.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] `src/demo/indoor/demo-hall.indoor.json`: 2 floors, about 10 rooms, 2 entrances (one step free), one stairs and one elevator, 2 or 3 landmarks. Clearly made up (no real UA layout).
- [ ] On the map as "Demo Hall": in Demo mode only, placed on an open spot near the Quad, with its floor 1 outline as its footprint. It must not show in Live mode.
- [ ] One course in `src/demo/schedule.json` moves to Demo Hall (for example room 216) so the demo script works.
- [ ] Passes `checkIndoor` (#{{M08}}) in a vitest.
- [ ] Shared files touched (`src/demo`) noted in the PR.

## Depends on

#{{M08}}, #{{M02}}

## Traces to interview

Interview #: none. Demo data.

<!-- issue key=M10 labels="map-3d,should" milestone="Map 3D proof of concept" -->
# Floor plan importer (dev screen)

## Story

As the map owner
I want to trace a floor plan in Inkscape and turn it into our indoor format
so that adding the real building takes an afternoon, not a week.

## Priority (MoSCoW)

Should (only if UA approves, #{{M03}})

## Size

M

## Acceptance criteria

- [ ] `docs/map-3d/tracing.md`: how to trace in Inkscape. One layer per floor (`floor-1`). Inside it: `outline`, `room-116` shapes, `door-116` dots, `walk` lines, `entrance-north` dots, `stairs-a` and `elevator-1` dots, `landmark` text, and one `scale` line with its real length. Straight lines only.
- [ ] A dev screen (next to `#/dev`) reads the SVG with the browser's own `DOMParser`. No new package. The file never leaves the computer.
- [ ] Pure `parsePathD(d)` handles `M L H V Z`, upper and lower case. vitest.
- [ ] Pure `svgToIndoor(layers, scale)` builds the indoor JSON. vitest with a tiny made up SVG.
- [ ] Shows the result on top of the 2D map so `origin` and `rotation` can be lined up by eye, then saves the JSON to a file.
- [ ] Runs `checkIndoor` and lists problems before saving.

## Depends on

#{{M08}}, #{{M03}}

## Traces to interview

Interview #: none. Tooling.

<!-- issue key=M11 labels="map-3d,should,tech-lead" milestone="Map 3D proof of concept" -->
# Load real indoor data from this computer in Live mode

## Story

As a student using the desktop app
I want the walkthrough to work for real buildings I have indoor files for
so that real buildings work without those files ever being on GitHub.

## Priority (MoSCoW)

Should (only if UA approves, #{{M03}})

## Size

M

## Acceptance criteria

- [ ] Electron reads `*.indoor.json` from an `indoor` folder in the app's user data folder. No network. Tech lead change (electron/ and preload), noted in the PR.
- [ ] Exposed as `window.studyHub.indoorList()` and `indoorGet(buildingId)`. Demo bridge returns Demo Hall only.
- [ ] Every file goes through `checkIndoor`. Bad files are skipped with a plain message in Settings, not a crash.
- [ ] Settings shows "Indoor maps on this computer" with the building names and an "Open folder" button.
- [ ] Never logs file contents.

## Depends on

#{{M08}}, #{{M02}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M12 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Find the room in a class location

## Story

As a student
I want the app to know my room, not just my building
so that "Walk me there" goes to the right door.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] Pure `roomOf(where)` in `campusMap.js`: "Bidgood Hall 116" gives "116", "Room 1093, Shelby Hall" gives "1093", "Lloyd 38A" gives "38A", "Online" and "TBA" give null.
- [ ] Pure `findRoom(where, indoor)` returns the building's indoor room, or null with a plain reason ("We don't have the inside of this building yet").
- [ ] Class meetings from myBama already have `room`; use it first, then fall back to `roomOf`.
- [ ] vitest for each case above.

## Depends on

#{{M08}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M13 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Indoor route from a door to a room, with step free

## Story

As a student
I want the shortest walk from a building door to my room, and a step free one when I need it
so that I get there on time and in a way that works for me.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Pure `buildGraph(indoor)` in `indoor/route.js`: points on `walk` lines become nodes, points within 0.5 m merge, each room door and entrance joins its nearest walk point, links with the same id join across floors.
- [ ] Pure `route(graph, fromEntranceId, toRoomId, { stepFree })` uses A*. Stairs cost more than flat walking. Step free skips stairs and entrances that are not step free.
- [ ] Default start: the `main` entrance. The student can pick another.
- [ ] Returns points, floors, length in meters, and a reason when there is no route ("No step free way to Room 216").
- [ ] vitest on Demo Hall: same floor, other floor by stairs, other floor by elevator with step free, no route.

## Depends on

#{{M08}}, #{{M09}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M14 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Plain steps from a route

## Story

As a student
I want short written steps for my route
so that I can follow it without the 3D, or read it on the way.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Pure `steps(route, indoor)` in `indoor/steps.js` returns a short list like: "Go in the North door." "Walk straight about 60 feet, past the vending machines." "Turn left." "Take stairs A up to floor 2." "Room 216 is the third door on your left."
- [ ] Turns from the angle between lines: left, right, or straight. Small bends do not count as turns.
- [ ] Left or right side of the room from the walking direction.
- [ ] Feet, rounded to the nearest 10. Landmarks used when one is near.
- [ ] Each step keeps the part of the route it covers, so the 3D view can follow along.
- [ ] Short sentences, everyday words (rule 12).
- [ ] vitest on Demo Hall routes, including step free.

## Depends on

#{{M13}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M15 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# Walkthrough view

## Story

As a student
I want to watch my route play out inside the building
so that the building feels familiar before I get there.

## Priority (MoSCoW)

Must

## Size

L

## Acceptance criteria

- [ ] `src/features/map/three/Walkthrough.jsx`. Opens over the 3D campus at the building.
- [ ] Floors drawn as slabs with low cut away walls (about 1.2 m) so you can see into rooms. The goal room stands out.
- [ ] Floors pull apart so you can see both ends of a route that changes floors.
- [ ] Route drawn as a line. A marker moves along it.
- [ ] Play, pause, next step and back. The camera follows the marker. The step list highlights the current step, and tapping a step jumps there.
- [ ] Step free switch and entrance picker re run the route (#{{M13}}).
- [ ] Reduced motion: no camera animation, it jumps step to step.
- [ ] Esc or Back returns to the campus view at the same building.
- [ ] Works in Demo mode with Demo Hall at laptop and phone width.

## Depends on

#{{M06}}, #{{M13}}, #{{M14}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M16 labels="map-3d,must" milestone="Map 3D proof of concept" -->
# "Walk me there" from the place panel and Your day

## Story

As a student
I want a "Walk me there" button next to my class
so that I get from my schedule to the walkthrough in one tap.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] In Your day (`MyClasses.jsx`) and in the place panel's "Your classes here": "Walk me to Room 216" when we have the inside of that building and find the room (#{{M12}}).
- [ ] When we do not: no button, and no fake one. The place panel says "We don't have the inside of this building yet."
- [ ] New route `#/map?walk=<building id>&room=216` opens the walkthrough directly (deep link).
- [ ] A new place panel section follows the panel's SECTIONS pattern.

## Depends on

#{{M12}}, #{{M15}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M17 labels="map-3d,a11y,must" milestone="Map 3D proof of concept" -->
# Text only mode and accessibility check

## Story

As a student who uses a keyboard, a screen reader, or an old laptop
I want the walk directions to work without the 3D
so that the feature works for me too.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] A "Steps only" view shows the plain steps with no 3D. It is used when WebGL is off, and anyone can pick it.
- [ ] Every 3D control works by keyboard with a visible focus ring. Targets meet our sizes (44 px under 900 px wide).
- [ ] The current step is announced (`aria-live="polite"`).
- [ ] Text contrast at least 4.5 to 1 in both themes, including labels drawn over 3D.
- [ ] Reduced motion respected everywhere in 3D (#{{M07}}, #{{M15}}).
- [ ] Checked by a teammate who did not build it. Notes in this issue.

## Depends on

#{{M15}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M18 labels="map-3d,could" milestone="Map 3D proof of concept" -->
# A photo at each turn

## Story

As a student
I want a photo of what I should see at each turn
so that I know I'm in the right hallway.

## Priority (MoSCoW)

Could

## Size

M

## Acceptance criteria

- [ ] Indoor format allows a `photo` at a walk point. Steps near it show the photo.
- [ ] Real photos load only from the local indoor folder (#{{M11}}). Never committed (#{{M02}}).
- [ ] Photos have no people in them. Taken outside class time, with permission where needed.
- [ ] Demo Hall uses simple drawn placeholders, not photos of real buildings.
- [ ] Every photo has alt text that says what to look for.

## Depends on

#{{M14}}, #{{M11}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M19 labels="map-3d,could,decision" milestone="Map 3D proof of concept" -->
# One scanned room (Gaussian splat)

## Story

As a student
I want to see a lifelike 3D scan of my classroom at the end of the walk
so that I recognize the room when I walk in.

## Priority (MoSCoW)

Could (after the class demo)

## Size

L

## Acceptance criteria

- [ ] Try first, decide second: three.js has a built in Gaussian splat renderer from r186, but it uses the WebGPU renderer. Check it runs in our Electron on Windows and Mac. If not, propose Spark (World Labs, MIT) as a new package under rule 8.
- [ ] Scan one empty room with a free phone scanning app, export `.spz` or `.ply`, keep it in the local indoor folder only.
- [ ] Shows at the last step of the walkthrough. Loads only then.
- [ ] Falls back to the plain model if it fails or the file is missing.

## Depends on

#{{M15}}, #{{M11}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=M20 labels="map-3d,could" milestone="Map 3D proof of concept" -->
# "Preview tomorrow's walk" on Home

## Story

As a student
I want Home to offer a walk preview when tomorrow has a class in a building I haven't been to
so that I don't get lost on day one.

## Priority (MoSCoW)

Could

## Size

S

## Acceptance criteria

- [ ] Pure picker: tomorrow's classes in buildings we have the inside of. vitest.
- [ ] A small Home tile: "Tomorrow: MIS 430 in Demo Hall 216. Preview the walk." Opens the deep link from #{{M16}}.
- [ ] Only shows when there is something to preview.
- [ ] Front door is the tech lead's slice: shared files noted in the PR.

## Depends on

#{{M16}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=R00 labels="rename,epic" milestone="Rename to AL" -->
# Rename Projector to AL (tracking)

## Story

As the team
I want the app renamed to AL everywhere, without students losing their data or sign in
so that the name matches where the app is going.

The name AL is approved by our professor (11/11). Scope: `docs/al/scope.md`, part 1.

## Priority (MoSCoW)

Must

## Size

M

## Issues

- [ ] #{{R02}} Keep students' data and sign in through the rename
- [ ] #{{R03}} Rename the app in code, UI and docs
- [ ] #{{R04}} New app icon (original elephant, not Big Al)
- [ ] #{{R05}} Rename the GitHub repo and Pages link

## Traces to interview

Interview #: none. Team decision.

<!-- issue key=R02 labels="rename,tech-lead,must" milestone="Rename to AL" -->
# Keep students' data and sign in through the rename

## Story

As a student who already uses the app
I want my saved data and my UA sign in to still be there after the rename
so that the update doesn't wipe my classes, flashcards or sessions.

## Priority (MoSCoW)

Must (merge before or with #{{R03}})

## Size

M

## Acceptance criteria

- [ ] Electron's user data folder (holds `studyhub.db`, `persist:blackboard`, backups) stays where it is after the app name changes. Either pin it with `app.setPath("userData", ...)` before `ready`, or move it once with a safe copy and only delete the old one after the copy checks out. Team picks one in the PR.
- [ ] `build.appId` stays `edu.ua.mis430.projector` unless the team decides otherwise, so the new installer upgrades the old app.
- [ ] Saved settings keys like `projector.mySessions` keep working. New keys can use `al.`, but reading falls back to the old key.
- [ ] Blackboard temp folder (`projector-bb`) handled.
- [ ] No migrations renumbered or deleted (rule 13).
- [ ] Tested: install the old build, add data, install the new build, data and sign in are still there.
- [ ] Tech lead change (electron/), noted in the PR.

## Traces to interview

Interview #: none.

<!-- issue key=R03 labels="rename,must" milestone="Rename to AL" -->
# Rename the app in code, UI and docs

## Story

As a student
I want to see AL everywhere in the app
so that the name is the same wherever I look.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] `package.json` `name`, `productName`, `description`, and installer names (`artifactName`, `nsis.shortcutName`) use the new name.
- [ ] `index.html` title, title bar, top bar, sidebar, About and Settings text use the new name.
- [ ] README, CLAUDE.md, CONTRIBUTING, design system docs and templates updated. Old scope docs can keep "Projector" where they describe history.
- [ ] Short disclaimer in About and the README: "AL is a student project. It is not an official University of Alabama app."
- [ ] A search for "Projector" in `src/`, `electron/` and `index.html` only finds kept keys or history notes.
- [ ] `npm test` and `npm run build` pass. Screenshots in Demo mode.

## Depends on

#{{R02}}

## Traces to interview

Interview #: none.

<!-- issue key=R04 labels="rename,companion,should" milestone="Rename to AL" -->
# New app icon (original elephant, not Big Al)

## Story

As a student
I want an app icon that matches the AL name
so that I can spot it on my taskbar.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Uses the original elephant from #{{A02}}, not Big Al, not an altered UA logo, trunk angled up (UA brand guide).
- [ ] Windows `.ico`, Mac `.icns`, and favicon for the web demo.
- [ ] Reads at 16 px and 256 px. Works on light and dark taskbars.
- [ ] Wired into electron-builder and `index.html`.

## Depends on

#{{A02}}

## Traces to interview

Interview #: none.

<!-- issue key=R05 labels="rename,could" milestone="Rename to AL" -->
# Rename the GitHub repo and Pages link

## Story

As the team
I want the repo name to match the app
so that links and releases say AL.

## Priority (MoSCoW)

Could (after the class demo, so demo links don't break)

## Size

S

## Acceptance criteria

- [ ] Repo renamed in GitHub settings (GitHub redirects the old URL).
- [ ] `build.publish.repo`, README links, the Pages link and any links in docs updated.
- [ ] `deploy.yml` checked: Pages still deploys.
- [ ] Each teammate updates their remote (`git remote set-url`).

## Depends on

#{{R03}}

## Traces to interview

Interview #: none.

<!-- issue key=A00 labels="companion,epic" milestone="AL companion" -->
# AL campus guide companion (tracking)

## Story

As a student
I want a small campus guide that walks around the app, shows me around, quizzes me and walks me to class
so that the app feels friendly and I learn it fast.

Scope: `docs/al/scope.md`, part 2. Built from Nova's baseline in Study Hub. Ships as an original elephant. Big Al only if UA approves.

## Priority (MoSCoW)

Should

## Size

L

## Issues

**First**
- [ ] #{{A01}} Ask UA for permission to use Big Al as an animated guide
- [ ] #{{A02}} Design the original elephant guide (poses and sprite sheet)

**Core**
- [ ] #{{A03}} Port Nova's baseline into a companion slice
- [ ] #{{A04}} Skins: one guide, swappable art and lines
- [ ] #{{A05}} Scripted lines and voice
- [ ] #{{A06}} First run tour
- [ ] #{{A07}} Settings and accessibility for the guide

**Then**
- [ ] #{{A08}} Flashcard quiz with the guide
- [ ] #{{A09}} Gentle alerts from the guide
- [ ] #{{A10}} The guide walks you to class in the map walkthrough

**Later**
- [ ] #{{A11}} Big Al skin (only if UA approves)
- [ ] #{{A12}} The guide on the desktop, outside the app window

## Traces to interview

Interview #: (fill in)

<!-- issue key=A01 labels="companion,task,must" milestone="AL companion" -->
# Ask UA for permission to use Big Al as an animated guide

## Story

As the team
I want UA's written answer on using Big Al in the app
so that we either build the Big Al skin with permission or ship the original elephant with no risk.

## Priority (MoSCoW)

Must (send on day one; build does not wait for the answer)

## Size

S

## Acceptance criteria

- [ ] Request sent to UA's Director of Brand Strategy (`brandapproval@ua.edu`). Big Al and athletic marks are reviewed by Trademark Licensing in the Athletics Department.
- [ ] Ask our instructor whether they will send it or sign on. Ask Student Involvement whether a class project has a tier.
- [ ] The request asks about an **animated, walking character** by name. UA's guide says approved logos can't be modified, so a plain logo approval would not cover it.
- [ ] It says: class project, free, not sold, not an official UA app, shows the disclaimer, and what screens Big Al would be on. Attach the original elephant design from #{{A02}} so they can compare.
- [ ] Answer recorded here. If no, close #{{A11}} as Won't. If yes, note exactly what was approved (art, poses, animation, where).

## Draft request

> Hello, our MIS 430 team is building a free student app (class project, not sold, not an official UA app) that helps students find their classes and campus resources. We would like to know if we could use Big Al as a small animated guide that walks around the app, waves, points at features and walks a student to their classroom on our campus map. We understand approved marks can't be modified, so we wanted to ask about animation directly. If that is not possible, we will use an original elephant that follows UA's elephant guidelines. Thank you.

## Traces to interview

Interview #: none.

<!-- issue key=A02 labels="companion,design,must" milestone="AL companion" -->
# Design the original elephant guide (poses and sprite sheet)

## Story

As a student
I want a friendly guide character with a few clear poses
so that it feels alive without getting in my way.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] An original cartoon elephant that does **not** look like Big Al (old or new) and has its **trunk angled up** (UA brand guide). No houndstooth, no "A" logo, no UA fonts.
- [ ] Mockup reviewed by the team next to UA's guide before any animation work.
- [ ] Poses: idle, walk (side, 6 to 8 frames), wave, point, talk, think, cheer, sleep.
- [ ] Sprite sheet spec written: frame size, frames per pose, frame rate, transparent PNG or WebP, light and dark theme check.
- [ ] Small enough to load fast (target under 300 KB for the whole sheet).
- [ ] Name picked for the original elephant (if not "Al").
- [ ] Art lives in `src/features/companion/skins/elephant/`.

## Traces to interview

Interview #: (fill in)

<!-- issue key=A03 labels="companion,must" milestone="AL companion" -->
# Port Nova's baseline into a companion slice

## Story

As a developer
I want Nova's core movement and talking from Study Hub, cleaned up, in AL
so that we start from working code instead of from scratch.

## Priority (MoSCoW)

Must

## Size

L

## Acceptance criteria

- [ ] New slice `src/features/companion/`. Added to the slices table in CLAUDE.md with its owner.
- [ ] From Study Hub's Nova, bring over only: walking around the window, idle, coming back, click to talk, speech bubble, pointing at an element on screen.
- [ ] Leave behind: any AI or API key code (rule 5), Nova's name, art, personality and cursing, anything that reads or says grades (rule 4), anything that drafts coursework (rule 7).
- [ ] Pure state machine in `companionState.js` (idle, walk, point, talk, sleep, hidden) with vitest tests. Pure `nextSpot(bounds, avoid)` that picks where to walk without covering the main content or open dialogs, with tests.
- [ ] Renders above the app with `pointer-events` only on the character, so it never blocks clicks.
- [ ] Hidden in Demo mode screenshots unless turned on (rule 6).
- [ ] Reuses the kept `companion_said` table (or local settings) so lines don't repeat. No migrations changed (rule 13).

## Bring over (from Study Hub)

- `src/companion/machine.js`: Nova's behavior states. Every change goes through `transition`, so impossible jumps can't happen. Starting point for `companionState.js`.
- `src/companion/useCompanionMotion.js`: moves the character with a CSS transform. The animation loop runs only while it walks, so an idle guide costs nothing.
- `src/companion/safeZones.js`: what the guide must never cover (panels, text, anything clickable). Starting point for `nextSpot`.
- `src/companion/attention.js`, `idleDirector.js`, `idleStages.js`: pure timing rules for when it may act on its own and which idle bit it does.
- `src/companion/hooks/useNovaAutonomy.js`, `useNovaPlacement.js`: wander, come back to its spot, keep its feet on something. Trim the sit and perch extras.
- `src/companion/hooks/useNovaInput.js`: idle clock, wake on input, Esc and window resize upkeep.
- `src/companion/SpeechBubble.jsx`: bubble anchored beside the character. Types text out; a click finishes it.
- `src/companion/Spotlight.jsx` and `src/nova/anchors.js`: a ring around an element, and the `data-nova-anchor` names the guide walks to and points at (rename the attribute).
- `src/companion/RadialMenu.jsx`: click menu around the character. Arrow keys, Enter and Esc already work.
- `src/companion/novaSound.js`: small sounds made in code, no audio files.
- `src/companion/hooks/useTimeouts.js`: timers that are cleared when the guide unmounts.

## Leave behind

- AI and API key code (rule 5): `electron/anthropicClient.cjs`, `src/companion/memory/rephrase.js`, and the Claude parts of `faq.js`, `useNovaExamSession.js` and `useNovaMemoryVoice.jsx`.
- Nova's art and 3D: `src/companion/nova3d/` (three.js hologram, model, shader), `NovaSprite.jsx`, `novaFrames.js`, `SplashNova.jsx`, `scripts/bake-nova-*.mjs`, `scripts/blender/`.
- Nova's lines and personality, including cursing: `character.js`, `packs/zombiesLines.js`, the swear levels in `src/nova/voice.js`, the "how much Nova swears" setting in `CompanionSettings.jsx`, `src/nova/mood.js`.
- Anything that reads or says grades (rule 4): the grade moves in `src/nova/director.js` (`gradeMoved`, grade up and down lines), `grade_up` episodes in `memory/derive.js`, pointing at standing gauges.
- What Nova remembers about the student: `src/companion/memory/`, `NovaMemoryView.jsx`, `NameForm.jsx`, `OnboardForms.jsx` (birthday).
- Study Hub extras: `CompanionLayer.jsx` itself (1,100 lines; write a small new layer), XP and levels in `companionStore.js` and `useNovaStudyEvents.js`, doodles, focus mode, the command bar (`src/nova/commands.js`), drag and drop, and the Station drafts (`electron/station/`, rule 7).
- Desktop Nova (`electron/desktop/`) waits for #{{A12}}.

## Traces to interview

Interview #: (fill in)

<!-- issue key=A04 labels="companion,must" milestone="AL companion" -->
# Skins: one guide, swappable art and lines

## Story

As the team
I want the character's art and lines in one skin folder
so that the original elephant and an approved Big Al use the same code.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] A skin is a folder: `skin.json` (name, sprite sheet, frames per pose, frame size), the sprite sheet, and `lines.json`.
- [ ] Pure `loadSkin(json)` checks the skin and falls back to the elephant on any problem. vitest.
- [ ] The elephant is the only skin in the repo. A skin can also load from the app's local data folder (Live mode), for a skin we can't commit.

## Depends on

#{{A03}}, #{{A02}}

## Traces to interview

Interview #: none.

<!-- issue key=A05 labels="companion,should" milestone="AL companion" -->
# Scripted lines and voice

## Story

As a student
I want the guide to sound upbeat and short, not robotic and not too much
so that I like having it around.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] `lines.json` grouped by moment: hello, idle, tour steps, quiz right and wrong, something due, new grade, map walk, goodbye.
- [ ] Short sentences, everyday words (rule 12). Clean. No cursing.
- [ ] No UA marks in lines ("Roll Tide" and the like) unless UA approves them in #{{A01}}.
- [ ] Never says a grade or score from Blackboard. "A new grade is up in GBA 490" is fine; the grade is not.
- [ ] Pure `pickLine(moment, said, now)` avoids repeats within a week. vitest.

## Depends on

#{{A04}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A06 labels="companion,must" milestone="AL companion" -->
# First run tour

## Story

As a new student
I want the guide to walk me through the app the first time I open it
so that I know where everything is in a minute.

## Priority (MoSCoW)

Must

## Size

M

## Acceptance criteria

- [ ] Tour steps in pure `tourSteps.js` (Home, a course, Calendar, Campus, Map, Settings). vitest for order and skip logic.
- [ ] The guide walks to each spot, points, and says one line. Next, Back and Skip on every step.
- [ ] Runs once. Can be replayed from Settings.
- [ ] Works by keyboard. The text is in a real dialog that screen readers read.
- [ ] Without the guide (turned off or reduced motion), the same tour shows as plain popovers.

## Depends on

#{{A03}}, #{{A05}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A07 labels="companion,a11y,must" milestone="AL companion" -->
# Settings and accessibility for the guide

## Story

As a student
I want to control how much the guide moves and talks
so that it helps me and never distracts me.

## Priority (MoSCoW)

Must

## Size

S

## Acceptance criteria

- [ ] Settings: guide on or off, "Stay still", sounds on or off, replay tour.
- [ ] Reduced motion on: the guide stays still in a corner, no walking.
- [ ] Never covers focused fields, dialogs or the grade card. Moves away when the student types.
- [ ] Speech bubbles are announced politely (`aria-live="polite"`) and can be closed with Esc.
- [ ] Sleeps after a few minutes with no input and while a screen reader focus is inside a form.
- [ ] Checked by a teammate who did not build it.

## Depends on

#{{A03}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A08 labels="companion,should" milestone="AL companion" -->
# Flashcard quiz with the guide

## Story

As a student
I want the guide to quiz me on my own flashcards
so that studying feels less like a chore.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] Uses the existing SM-2 decks (`src/lib/sm2.js`) and records answers the same way the study tab does.
- [ ] The guide asks, the student answers, the guide reacts (cheer or think pose and a line).
- [ ] Only the student's own cards. Nothing sent anywhere (rule 4). No AI (rule 5).
- [ ] Starts only when the student taps "Quiz me". Never pops up on its own during a class time.

## Depends on

#{{A05}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A09 labels="companion,should" milestone="AL companion" -->
# Gentle alerts from the guide

## Story

As a student
I want the guide to tell me when something new is due or a grade is posted
so that I don't miss it, without seeing a grade I didn't ask to see.

## Priority (MoSCoW)

Should

## Size

S

## Acceptance criteria

- [ ] Uses the data the app already has (due soon, new grades). No new outside calls.
- [ ] Says what changed and where, never the grade: "A new grade is up in GBA 490."
- [ ] At most one alert at a time, and a few per day. Snooze from the bubble.
- [ ] Off when the guide is off.

## Depends on

#{{A05}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A10 labels="companion,map-3d,should" milestone="AL companion" -->
# The guide walks you to class in the map walkthrough

## Story

As a student
I want the guide to walk my route ahead of me in the 3D walkthrough
so that following the route feels like being shown the way.

## Priority (MoSCoW)

Should

## Size

M

## Acceptance criteria

- [ ] In the walkthrough (#{{M15}}), the guide's walk pose shows as a flat sprite that faces the camera and moves along the route a little ahead of the camera.
- [ ] Says the current step in its bubble, from the plain steps (#{{M14}}).
- [ ] Waves at the goal room.
- [ ] Off when the guide is off or reduced motion is on. The steps still work.

## Depends on

#{{A04}}, #{{M15}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A11 labels="companion,could" milestone="AL companion" -->
# Big Al skin (only if UA approves)

## Story

As a Bama student
I want the guide to be Big Al
so that the app feels like ours.

## Priority (MoSCoW)

Could. Blocked until #{{A01}} has a written yes. If UA says no, close as Won't.

## Size

M

## Acceptance criteria

- [ ] Only the art, poses, animation and places UA approved, exactly as approved. Nothing altered beyond that.
- [ ] Art from UA or made to UA's terms. Not traced from photos or merchandise.
- [ ] Not committed to the public repo unless UA's approval says that is fine. Otherwise it loads as a local skin (#{{A04}}).
- [ ] Disclaimer still shows.

## Depends on

#{{A01}}, #{{A04}}

## Traces to interview

Interview #: (fill in)

<!-- issue key=A12 labels="companion,could,tech-lead" milestone="AL companion" -->
# The guide on the desktop, outside the app window

## Story

As a student
I want the guide to walk along my desktop like Nova did
so that I see due dates without opening the app.

## Priority (MoSCoW)

Could

## Size

L

## Acceptance criteria

- [ ] A small, clear, click through Electron window that sits above the taskbar. Tech lead change, noted in the PR.
- [ ] Off by default. Turned on in Settings. Easy to hide from the tray.
- [ ] Clicking the guide opens AL. Same rules as #{{A07}} and #{{A09}}.
- [ ] Uses little CPU when idle (sleeps when nothing moves).

## Depends on

#{{A03}}, #{{A07}}

## Traces to interview

Interview #: (fill in)
