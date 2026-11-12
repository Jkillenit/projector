# Tracing a floor plan in Inkscape

How to turn a floor plan into an indoor file (#62). It takes an afternoon for one building. The result follows [indoor-format.md](indoor-format.md).

**Rule 14:** the floor plan, the trace and the indoor file stay on your own computer. Never commit them, not even in a branch. [sample-trace.svg](sample-trace.svg) is a made up building you can open to see how a trace looks.

## Set up

1. Open Inkscape and import the floor plan image (File, Import). Lock its layer so you don't move it.
2. Turn on snapping (the magnet, top right). Snap to paths and nodes, so hallway lines meet and dots land on lines.
3. Draw **straight lines only**: the Pen tool (B) with clicks, no drags. Curves and arcs are not read.

## One layer per floor

Make a layer for each floor (Layer, Add Layer), named `floor-1`, `floor-2`, and so on. A basement is `floor-0` or `floor--1`. Layers with other names are skipped, so keep the plan image in a layer like `plan`.

Inside each floor layer, name each shape in Object, Object Properties, **Label** (then press Set):

| Label | Draw | Becomes |
|---|---|---|
| `outline` | a closed shape around the floor's outer wall | the floor outline |
| `room-116` | a closed shape around room 116 (a rectangle is fine) | room `116`, named "Room 116" |
| `door-116` | a small circle where room 116's door is | that room's door |
| `walk` | lines down the middle of every hallway. Use as many as you need, all labeled `walk` | walk lines (the route follows these) |
| `entrance-north` | a small circle where an outside door meets a walk line | entrance `north`, named "North door" |
| `stairs-a`, `elevator-1` | a small circle on a walk line. Use the **same label on every floor** it reaches | stairs or an elevator joining those floors |
| `landmark` | a text object, like "Vending machines" | a landmark used in the steps ("past the vending machines") |
| `scale-20` | **one** line along something you know the length of, labeled with its real length in meters | sets the size of everything |

Add words after an entrance label to say more about it: `entrance-north main stepfree` is the main door, and it has no stairs to get in. Step free routes only start at `stepfree` doors.

Hallway lines should meet: end a line on another line, and snapping does the rest. Doors in and stairs within 1.5 m of a walk line are moved onto it.

Only one floor needs the `scale` line. Every floor uses the same plan, so stairs on floor 1 and floor 2 sit at the same spot.

## Import

1. Save as Inkscape SVG.
2. In the app, go to `#/dev/plan` (the Floor plan importer).
3. Pick the SVG. The file is read in the page and never leaves your computer.
4. Type the building's name and press **Use it** to place it on the campus map. Then move the origin and turn the rotation until the red ground floor sits on the gray building.
5. Fix anything in the list of problems. A shape with a label we don't know is listed too.
6. Press **Save indoor file**, then put it in Settings, **Indoor maps on this computer**, Open folder.
