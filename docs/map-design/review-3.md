# Map design self review 3

A quality pass on the look of the scene: roofs, color, light and shade, trees, roads. Compared our Map and 2.5D views in Demo mode against UA's official campus map at the same framing (Riverside down to Bryant-Denny), light and dark, before and after. Screenshots of UA's map stay out of git (`scope.md`). Tracking: #131.

## Where we started

Next to UA's map ours looked washed out and flat: pale mint lawns with grain, every roof the same gray slab, sparse trees in one green, even light with faint shadows, parking lots as light as sidewalks.

## What this pass changed

| # | Seen | Fix | Issue |
|---|---|---|---|
| 1 | Every roof is a flat gray slab. | Hipped roofs from the footprint, rounded roofs on arenas, flat roofs with a light rim and rooftop units. | #166 |
| 2 | Washed out colors; the three roof tones are one gray; lots as light as sidewalks. | Deeper green campus, blue slate, gray and shingle roofs, asphalt lots, deeper brick. | #178 |
| 3 | Flat light. Buildings float on the lawn in Map view. Lawns are grainy from far away. The far half of 3D fades to white. | A warm sun over a cool sky. A soft dark edge on the ground around every building. Shader additions: detail fades with distance, big soft patches on the ground, walls darker at the base, crowns darker underneath. Lighter haze. | #179, #143 |
| 4 | Trees are sparse, one size and one green. | About twice as many on campus lawns, dense quads, three crown shapes, each tree its own green, soft crowns. | #168 |
| 5 | UA's map is drawn in fall color. | From October 15 to December 5 about half the trees turn gold, orange or rust. | #185 |
| 6 | Up close, Saban Field's words and yard numbers were mirrored. | Field textures no longer flip; ALABAMA is at the north end. | #187 |
| - | Roads have no edge up close. | A light curb and a dashed center line on main roads. | #169 |

## Where we stand against UA's map

**Level or ahead:** green campus with a quiet town around it; dark roads and white sidewalks; slate and shingle roofs with slopes that catch the light; dense trees in fall color with shadows; stall lines; fields and the stadium. On top of that we have what a drawing cannot: real 3D you can turn, three views of one scene, dark mode, tap and search, your classes pinned.

**Still behind,** in the order that closes the gap fastest:

| # | Seen | Why it matters | Where it is tracked |
|---|---|---|---|
| 4 | Halls are plain brick boxes under their new roofs. UA's map has white trim, columns, gable ends, dormers and cupolas. | The biggest gap left. Landmark halls are how students find their way. | #167, #194 |
| 7 | Coleman Coliseum is a flat tint: our data has it as an area, not a building. | A landmark is missing. | #189 |
| 8 | Parking decks have a slate or shingle roof. From above Magnolia Deck looks like a hall. | You cannot tell where to park. | #190 |
| 9 | The biggest flat roofs are blank light shapes. | The Student Center and Shelby Hall pull the eye for no reason. | #191 |
| 10 | Dark mode did not get the color grade. | Roofs are one gray at night. | #192 |
| 11 | Names are large and dark, with a wide halo, and no street names. | They cover the paths and trees around a hall. | #193, #152, #145 |
| 12 | Water is one flat blue. | The riverfront does not read. | #195 |
| - | No pools, fountains or plazas; no crosswalks. | Small, but they are where people meet and cross. | #170, #183 |
| - | Lots and lawns cannot go as dark as UA's. | The pick color must clear 3 to 1 on every surface (`contrast.test.js`). We kept that rule. | Decision in `scope.md` |
| - | Not checked on a phone. Trees went from 8,200 to 12,200 and the ground shader uses screen derivatives. | Frame time on a phone is unknown. | #129 |

## Next steps, in order

1. #167 facades, then #194 roof details on the landmark halls.
2. #189 Coleman, #190 parking decks.
3. #193 names on roofs, with #152 street names and #145 name order.
4. #192 dark grade, #191 big flat roofs.
5. #129 on a phone before more detail goes in.
6. #170, #183, #195 if time allows, then phase 4 (#125 to #128).

#196 is a script so the next review takes the same screenshots.
