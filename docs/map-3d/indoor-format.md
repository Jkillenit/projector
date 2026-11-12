# Indoor data format

One JSON file per building describes its inside: floors, rooms, hallways, doors, stairs and elevators. Demo Hall (#61), the floor plan importer (#62) and real buildings in Live mode (#63) all use this format.

Run `checkIndoor(data)` from `src/features/map/indoor/indoorData.js` on any file before using it. It returns `{ ok, problems }`, with each problem in plain words.

**Rule 14:** real floor plans and real indoor files never go in the repo. Only made up buildings like Demo Hall do.

## Where real files go (Live mode, #63)

Put `<name>.indoor.json` in the `indoor` folder in the app's data folder. Settings, **Indoor maps on this computer**, has an **Open folder** button and lists the buildings it found. Files that fail `checkIndoor`, are not JSON, or are over 5 MB are skipped and listed there with the reason. A building's `name` should match its name on the campus map so classes find it. Nothing is sent anywhere. Demo mode only ever has Demo Hall.

## Units and placement

- All numbers are **meters**, same as `campus.json`.
- Points are `[x, y]`. On a plan, `x` goes right and `y` goes down, like an image. `[0, 0]` is a corner of your choice, usually the top left of the floor plan.
- `origin` is where the plan's `[0, 0]` sits on the campus map, in campus meters (x east, y south).
- `rotation` turns the plan clockwise on the map, in degrees, around its `[0, 0]`. Optional, default `0`.
- `toCampus(point, data)` turns a plan point into a campus point: turn first, then add `origin`.
- Every floor uses the same plan meters, so stairs on floor 1 and floor 2 sit at the same `[x, y]`.

## Building

| Field | Type | Meaning |
|---|---|---|
| `building` | string | Id of the building. Matches its `id` in `campus.json` (like `w123456`), or a made up id for a made up building. |
| `name` | string | Name shown to the student, like `"Demo Hall"`. |
| `origin` | point | Where the plan's `[0, 0]` is on the campus map. |
| `rotation` | number | Degrees clockwise. Optional. |
| `floorHeight` | number | Meters from one floor to the next. More than 0. |
| `floors` | list | At least one floor. |

## Floor

| Field | Type | Meaning |
|---|---|---|
| `level` | number | `1` is the ground floor, `2` the next one up, `0` or `-1` below ground. Each level is used once. |
| `name` | string | Like `"Floor 2"` or `"Basement"`. Used in steps and in checker messages. |
| `outline` | list of points | The floor's outer wall, 3 or more points. |
| `rooms` | list | Rooms a student can be sent to. |
| `walk` | list of lines | Hallway center lines. Each line has 2 or more points. Their points become the route graph (#65). |
| `entrances` | list | Doors in from outside. Usually only on the ground floor. |
| `links` | list | Stairs and elevators. |
| `landmarks` | list | Things to steer by in the steps ("past the vending machines"). |

## Room

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Room number as it appears in a class location, like `"216"`. Used once in the whole building. |
| `name` | string | Like `"Room 216"`. Optional, defaults to `Room <id>`. |
| `outline` | list of points | The room's walls, 3 or more points. |
| `door` | point | Where the door is. The route ends here. |

## Entrance

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Like `"north"`. |
| `name` | string | Like `"North door"`. Used in steps. |
| `at` | point | Must be on a walk line (within 0.5 m). |
| `stepFree` | true/false | No stairs to get in. Step free routes (#65) only start here. |
| `main` | true/false | The door most people use. |

The building needs at least one entrance.

## Link (stairs or elevator)

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Same `id` on two or more floors joins those floors. |
| `name` | string | Like `"Stairs A"`. Optional, defaults to the id. |
| `kind` | `"stairs"` or `"elevator"` | Step free routes use elevators only. |
| `at` | point | Must be on a walk line on that floor (within 0.5 m). |

A link that appears on only one floor is a problem.

## Landmark

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Like `"Vending machines"`. |
| `at` | point | Where it is. |

## Example

```json
{
  "building": "demo-hall",
  "name": "Demo Hall",
  "origin": [410, -220],
  "rotation": 12,
  "floorHeight": 4,
  "floors": [
    {
      "level": 1,
      "name": "Floor 1",
      "outline": [[0, 0], [60, 0], [60, 30], [0, 30]],
      "rooms": [{ "id": "116", "name": "Room 116", "outline": [[2, 2], [12, 2], [12, 10], [2, 10]], "door": [7, 10] }],
      "walk": [[[0, 15], [60, 15]], [[30, 0], [30, 15]]],
      "entrances": [{ "id": "north", "name": "North door", "at": [30, 0], "stepFree": true, "main": true }],
      "links": [
        { "id": "stairs-a", "name": "Stairs A", "kind": "stairs", "at": [5, 15] },
        { "id": "elevator-1", "name": "Elevator", "kind": "elevator", "at": [55, 15] }
      ],
      "landmarks": [{ "name": "Vending machines", "at": [20, 16] }]
    }
  ]
}
```

This example has one floor, so the checker will say `Stairs A is only on one floor` and `Elevator is only on one floor`. A real file repeats the stairs and elevator on each floor they reach.

## What the checker finds

- Missing building id, name, origin or floors. Rotation that is not a number. Floor height of 0 or less.
- Two floors with the same level. A floor with no outline.
- A room with no number, no outline or no door. A room number used twice.
- A walk line with under 2 points.
- No entrance. An entrance or link with no place, or not on a walk line.
- A link that is not stairs or an elevator, or is only on one floor.
- A landmark with no name or no place.
