# AL: new name and a campus guide companion

Scope for two changes that go with the map work:

1. **Rename Projector to AL** (for Big Al). Our professor approved the name on 11/11.
2. **A mini campus guide that walks around the app**, built from Nova's baseline in Study Hub, and remodeled as a Big Al style elephant.

Issues: [docs/issues/next.md](../issues/next.md) (keys R00 and up for the rename, A01 and up for the companion).

## The one thing to get right first: Big Al belongs to UA

Big Al, "Roll Tide", "Bama" and UA's logos are UA trademarks. UA's brand guide says:

- Current Big Al logos cannot be used without permission from Trademark Licensing. Requests go through the Director of Brand Strategy at `brandapproval@ua.edu`.
- A cartoon elephant can be made, but it must not look like Big Al (old or new), and its trunk must be angled up.
- An approved logo cannot be modified in any way. A walking, animated Big Al is a modification, so we have to ask about that by name.

Our repo and GitHub Pages are public, so anything we commit is published. So:

- **Default:** AL ships with an **original elephant guide** that does not look like Big Al and follows UA's elephant rule (trunk up).
- **Big Al skin:** only if UA approves in writing. Until then, no Big Al art, photos or traced drawings in the repo.
- The companion is built so the character is a **skin** (art plus lines). Swapping in Big Al later is one file, not a rewrite.
- App text says AL is a student project and is not an official UA app.

## Part 1: rename to AL

What changes: app name, window title, UI text, README, CLAUDE.md, CONTRIBUTING, the installer name, and maybe the repo name and GitHub Pages link.

Watch out for these:

- **Students' saved data.** Electron puts the database (`studyhub.db`), the Blackboard sign in (`persist:blackboard`) and backups in a user data folder named after the app. Renaming the app moves that folder, and students would lose their data and get signed out. We pin the folder or move it once, safely.
- **Install identity.** `build.appId` (`edu.ua.mis430.projector`) decides whether the new installer upgrades the old app. We keep it unless the team decides otherwise.
- **Saved settings keys** like `projector.mySessions`. We keep reading the old keys.
- **Repo rename.** GitHub redirects the old URL, but the Pages link, `build.publish` and README links change.
- **Migrations.** Rule 13 still holds. No renumbering or deleting.

## Part 2: the companion ("Al")

Called "Al" in this doc. The real name for the original elephant is a team pick.

**Baseline from Nova (Study Hub)** that we keep:

- A small character that walks around the app window, idles, and comes back.
- Click to talk. It points at things on screen.
- First run tour: it walks the student through the app.
- Quizzes the student on their own flashcards (SM-2 decks already in the app).
- Gentle alerts (something new due, a new grade posted, without showing the grade).

**What we drop from Nova:**

- No live AI and no API key. Rule 5 says no LLM calls. Every line is scripted.
- No cursing or adult jokes. This is a UA themed guide, maybe for every student.
- Nova's name, look and personality.
- It never reads grades aloud or shows them unless the student opened them first (rule 4 and grades hidden by default).
- It never drafts or does coursework (rule 7).

**New for AL:**

- **Al walks you to class.** In the map walkthrough (Map 3D), Al walks the route ahead of the camera.
- A skin system so the original elephant and an approved Big Al use the same code.
- Settings: turn Al off, keep Al still, mute sounds. Reduced motion means Al stays put.

**Later (Could):** Al walking on the desktop outside the app window, like Nova's desktop version. That needs a tech lead Electron change.

## Where the code goes

- `src/features/companion/` (new slice). Add it to the slices table in CLAUDE.md with its owner.
- Pure logic (state machine, where to walk, which line to say, tour steps) gets vitest tests.
- Art in `src/features/companion/skins/<skin>/`: a sprite sheet and a `lines.json`.
- Old tables `companion_memory` and `companion_said` in `electron/database.cjs` stay (rule 13). `companion_said` can be reused so lines don't repeat.

## Build order

The map work comes first. This runs beside it or right after.

| Step | Work |
|---|---|
| 1 | Big Al permission request out on day one. Pin the user data folder. |
| 2 | Rename code and docs. Original elephant design: poses and sprite sheet. |
| 3 | Port Nova's baseline into `companion/`: walk, idle, talk, point. Skin system. |
| 4 | Tour. Settings and accessibility. |
| 5 | Flashcard quiz. Alerts. Al in the map walkthrough. |
| Later | Big Al skin (only if approved). Desktop walker. Repo rename. |

## Questions for the team

1. Display name "AL" or "Al"?
2. Who sends the Big Al request, us or our instructor? Do we ask Student Involvement too?
3. What do we call the original elephant if UA says no?
4. Who owns the companion slice?
5. Rename the GitHub repo now, or after the class demo?
