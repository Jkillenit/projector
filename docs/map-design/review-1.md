# Map design self review 1

After phase 2 and the first half of phase 3 (#118 to #122). Looked at the 3D view and the Map view at default zoom in Demo mode, light theme, plus the code from those PRs. Tracking: #131.

## What works

- One scene, three views: the same place in every view, switching animates.
- Names thin out and never cover a pin. Pins are easy to see and have a ring.
- Brick walls with window rows read as UA from the 3D view. Water, roads and parking read clearly.

## What to improve

| # | Seen | Why it matters | Where it is tracked |
|---|---|---|---|
| 1 | Every building is about the same height. Untagged buildings default to 11 m, which is most of them. | 3D looks like one flat block of boxes, not a campus skyline. | #142 |
| 2 | Footpaths look dotted from above (the Quad). Walls look muddy brown from far away. | Slab joints and dark window glass blur into dashes and dark stripes once the texture is small on screen. | #143 |
| 3 | The Quad and other parks look gray green, not like lawn. | Named parks are only a see-through tint until the OSM rebuild counts them as grass (#121), and the grass texture darkens the green a little. | #144 |
| 4 | Parking decks, Greek houses and shops (Publix, Fresh Foods, Rotary International) get names before many academic buildings. | Names rank by footprint only, so big parking decks win. Students look for classroom buildings first. | #145 |
| 5 | Parking decks get brick and windows. Denny Chimes, a bell tower, gets window rows. | Wrong at a glance for places students use to find their way. | #146 |
| 6 | Bryant-Denny Stadium is a large empty gray oval. | The biggest landmark on campus looks like a hole. It is only an area in OSM, with no outline. | #130 (comment: raise to Should) |
| 7 | Map and 2.5D look flat: roofs are tan shapes on beige, walls barely show. | Without shadows the default view looks like the old SVG map. | #124 (comment) |
| 8 | No trees anywhere. | Campus is green; the Quad's oaks are its best-known feature. | #123 (next) |
| 9 | The 3D view ends in a flat background color at the top, no sky or haze. | The far edge looks cut off. | #125 (comment) |
| 10 | The flat fallback map's class squares are tiny at the default zoom. | Without WebGL the student's own classes are hard to spot. | #147 |

## Code notes

- The label overlay reads three bounding boxes and projects about 360 names on every draw, during flights too, and the HTML renderer restyles every label each frame. Fine on a laptop, likely heavy on a phone. #129 (comment).
- Hover repaints the whole named-building color buffer on each change. Cheap at 327 buildings; recheck if the building count grows.
- Dark theme for the new colors (`--map-brick`, `--map-landmark`, textures) is covered by tokens and tests, not checked on screen.
