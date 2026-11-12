# Map design self review 2

After phase 3's data and look work (#121 to #124, #142, #144, #149, #150, #162). Compared our 2.5D view in Demo mode, light theme, against UA's official campus map and a Google Earth aerial, at two framings: the Quad down to Bryant-Denny, and the athletics area (Sewell-Thomas, Coleman, Sam Bailey). Screenshots of UA's map and the aerial stay out of git (`scope.md`). Tracking: #131.

## What works

- The layout reads like the real campus: the Quad, University Boulevard, the stadium and the fields are where they should be.
- Green campus, dark roads, white sidewalks and slate roofs match the bar from `scope.md`.
- Football, baseball and practice fields look like fields. Shadows give the 2.5D view depth.
- The map now fills the window on laptops and wide screens (#162).

## What to improve

Ordered by how much each closes the gap with UA's map.

| # | Seen | Why it matters | Where it is tracked |
|---|---|---|---|
| 1 | Sam Bailey Track shows as red triangles and strips. | Looks broken; UA's map shows a clean red oval. | #163 |
| 2 | Bryant-Denny is crimson all around. From the air it is mostly light gray and white, with crimson only in a few blocks, a white canopy ring and a light outside wall. | The biggest landmark should be the easiest to recognize. | #164 |
| 3 | The town outside campus is full of brick boxes with windows, as busy as campus. | UA's map keeps the town plain so campus stands out. Ours makes you hunt for the edge. | #165 |
| 4 | Every roof is a flat gray slab. UA's map has hipped and gabled roofs, barrel roofs on Coleman and Crisp, and white flat roofs with units. | Roofs are most of what you see in Map and 2.5D. Flat slabs make every building look the same. | #166 |
| 5 | Every wall is the same brick with window rows. UA's halls have white trim, cornices and columned fronts (Gorgas, the President's Mansion, the Quad's halls). | Landmark halls are how students find their way. | #167 |
| 6 | Trees are sparse, one size and one green. The Quad in both references is packed with big oaks; streets have rows. | Trees are the Quad's best-known feature, and they fill the empty lawn. | #168, then #128 for fall color |
| 7 | Parking lots are empty gray outlines with dark bands. | The large lots by Coleman look unfinished next to UA's rows of stalls. | #151 (top of the order), #146 for decks |
| 8 | Roads have no curbs, crosswalks or center lines up close. | Small, but it is where students cross. | #169 |
| 9 | No pools, fountains or plazas. | Places people meet at do not show. | #170 |
| 10 | Street names are missing; some shops and houses get names before halls. | Already tracked. | #152, #145 |

## Next steps, in order

1. #163 track bug (small, looks broken today).
2. #151 parking stalls, then #146 decks.
3. #164 Bryant-Denny from the aerial.
4. #165 quiet town.
5. #166 roof shapes.
6. #168 trees, then #128 seasons.
7. #167 facades.
8. #152 street names and #145 name order.
9. #169 and #170 if time allows, then phase 4 (#125 to #127) and #129 on a phone.

After step 8, do the side by side check from `scope.md` again at both framings, light and dark.
