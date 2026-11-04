# UI redesign plan

Visual layer only. Sync logic, database schema, IPC channel names and the Blackboard sign in flow stay as they are.

## What already exists and is reused

- Geist and Geist Mono are bundled locally through `@fontsource/geist-sans` and `@fontsource/geist-mono`. No runtime font loading.
- Fuzzy search with typo tolerance: `src/lib/fuzzy.js`. Used for Campus and the command palette. No Fuse.js or cmdk (CLAUDE.md rule 8: no new packages).
- Grade math: `src/features/grades/gradeMath.js` (JS, tested). The new "where you stand" math goes there instead of `src/lib/gradeMath.ts`, because the repo is plain JS.
- Task ranking: `rankToday` in `src/features/today/priority.js`.
- Ask outcomes: `match()` in `src/features/guide/matcher.js`. Guardrails are not touched (rule 11).
- Club time fit: `src/features/clubs/clubMatch.js`.

## Files to add

- `src/styles/tokens.css`: every color, font and radius token, dark and light. Course palette slots.
- `src/styles/ui.css`: base reset, shared components, shell and screens.
- `src/components/ui/index.jsx`: Button, TextLink, Card, CourseDot, CodeTag, Pill, Chip, Segmented, ProgressBar, StepList, Notice, VisuallyHidden.
- `src/components/ui/Icon.jsx`: hand-written stroke icons.
- `src/shell/useRoute.js`: tiny hash router (`#/home`, `#/course/:id/:tab`, `#/campus`, `#/dev/ui`).
- `src/shell/Sidebar.jsx`: new sidebar with the sync box. Replaces `AppRail.jsx`.
- `src/features/campus/CampusScreen.jsx`: Resources and Clubs on one screen.
- `src/features/dev/UiGallery.jsx`: hidden `#/dev/ui` route.

## Files to change

- `src/main.jsx`, `src/app/App.jsx`: new CSS, routing, sidebar, no floating date, no Live badge.
- `src/components/TitleBar.jsx`: transparent drag strip, window controls only.
- `src/shell/CourseColors.jsx`, `src/features/dashboard/courseColor.js`: 6 slot palette, saved per Blackboard course id, gray for orientation shells.
- `src/features/dashboard/courseLabel.js`: `getCourseLabel`.
- Home: `src/features/frontdoor/*`.
- Course page: `src/features/courses/*`, `src/features/grades/GradesTab.jsx`, `src/features/mirror/*View.jsx`.
- Ask: `src/features/guide/AskScreen.jsx`, `copy.js` (copy only).
- Calendar, Settings, command palette, Welcome, sync panel.
- Demo fixtures in `src/demo/` (one course gets the grade math fixture, Ask sample questions).

## Files to remove

- `src/studyhub-bootstrap.css` and the Bootstrap import, once no screen uses their classes. The old Study Hub styles carry most of the stray hex colors.
- `src/app.css`, replaced by `src/styles/ui.css`.
- Unused old shell parts (`AppRail.jsx`, `AskBar.jsx`, the old SyncBar strip).

## Order

1. Tokens and fonts
2. Shared components and `#/dev/ui`
3. Shell, sidebar, routing
4. Home
5. Course page and Grades tab math
6. Ask, Campus, command palette, drawer under 900px
7. Phone shell under 600px (may have)

## Notes for the PR (CLAUDE.md rule 1)

This touches `src/shell`, `src/platform` (none planned beyond reading), `src/demo` and shared CSS. Branch is `ui-redesign` as the build prompt asked, not `story/<n>-<name>`.
