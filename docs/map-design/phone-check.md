# Phone check (#129)

Review 3 asked for this before more detail goes in: trees went from 8,200 to 12,200 and the ground shader got heavier, and nobody had timed the map on a phone.

## How to check a real phone

1. Open the Pages link on the phone, pick a demo student, and go to the map with `?perf` at the end: `.../#/map?perf=1`.
2. Drag the map around for ten seconds, in 2.5D and in 3D.
3. Read the line at the top left of the map and write it down with the phone's model.

| Number | What it means | Good |
|---|---|---|
| tier | `low` on phones: no real shadows, pixel ratio 1 | `low` on any phone |
| fps | Frames per second while the map moves (the average, so stutter counts) | 30 or more |
| slow frames | Share of frames under 30 fps | under 10% |
| draw, slowest tenth | CPU time for one draw: the typical one, and the slowest one in ten | under 16 ms, under 33 ms |

The readout is off without `?perf` and shows nothing about the student.

## What we found without a phone

Chrome at phone size (390 by 844, touch) on a laptop, with the CPU slowed 4 times to stand in for a mid-range phone. The laptop's GPU is much stronger than a phone's, so this checks the CPU side only. GPU cost still needs a real phone.

At the opening 2.5D view, before the fixes: about 36 fps while dragging, with 1 frame in 10 taking 50 to 66 ms. One draw was 38 GPU calls and about 574,000 triangles.

A CPU profile showed three rebuilding shader state on every draw, about a third of the draw:

| Cause | Fix |
|---|---|
| On the Low tier one shadow material was used by the building patches (plain mesh) and the tree blobs (instanced). three keeps one program per material, so it switched it twice per draw. | The tree blobs get their own copy. |
| See-through, two-sided ground layers (center lines, stall lines, the soft shade around buildings) are drawn in two passes, and three marks the material changed before each pass. | `forceSinglePass` on those flat layers. One sheet has no back to sort, so it looks the same. |

After: 36 GPU calls and about 518,000 triangles per draw, and no material changes between draws. Four before and after pairs at 4 times slower: 3 of 4 pairs faster, about 22 to 26 fps on average. The laptop runs were noisy, so read that as "better", not as an exact number.

Also: the map now draws at most once per screen frame. In this test the browser was already giving each move its own frame, so it did not measure faster; it guards phones that send touch moves faster than they draw.

## Still open

- A real phone, with the readout above. The numbers decide the next step.
- If the CPU is still short: the name layer is the next biggest cost (about 8 ms per draw at 4 times slower). three's CSS2DRenderer restyles all ~360 names on every draw, even hidden ones.
- If the GPU is short: tree crowns are 80 triangles each on every tier. A rounder 20 triangle crown on Low would cut about three quarters of the tree triangles.
