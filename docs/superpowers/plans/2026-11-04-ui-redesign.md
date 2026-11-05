# Projector UI Redesign ("Bento Campus") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every Projector screen to the Bento Campus system: light first, UA crimson, Atkinson Hyperlegible, gold for new, a bento home, and a phone tab bar.

**Architecture:** The look is token driven. `tokens.css` carries new colors, radius, shadow and font tokens, and `ui.css` is swept to use only those tokens, with tests that enforce it. Layout changes are CSS grid and areas on the existing class names. The only new JS is a phone tab bar (`src/shell/TabBar.jsx` + pure `tabs.js`), a home events tile, and a pure `homeEvents()` picker. No data, sync or guide logic changes.

**Tech Stack:** React 18, Vite 6, plain CSS (tokens + `ui.css`), vitest, Electron 34. One new package: `@fontsource-variable/atkinson-hyperlegible-next@^5.3.0`. One removed: `@fontsource/geist-sans`.

**Spec:** [design-system/projector/MASTER.md](../../../design-system/projector/MASTER.md). Every value below that isn't written out comes from there.

## Global Constraints

- Hex colors live only in `src/styles/tokens.css` (the existing test enforces this).
- The only gradient stays `linear-gradient(180deg, var(--course-wash), transparent)` (the existing test enforces this).
- `ui.css`: `border-radius` only `var(--r-sm|md|lg|full)` or `50%`; `box-shadow` only `var(--shadow-1|2|3)`, `var(--ring)` or `none`; no `font-size` under `12px`.
- Text contrast ≥ 4.5:1 and input borders ≥ 3:1 in **both** themes.
- Targets ≥ 44×44 under 900px and ≥ 32×32 at 900px and up.
- DOM order = visual order at every breakpoint. No hover transforms. The reduced-motion rules stay.
- CLAUDE.md rules: demo mode only for screenshots (6); no change to `matcher.js` guardrails or crisis/sensitive copy (11); plain short UI copy (12); grades start hidden every session (unchanged behavior); `npm test` and `npm run build` green before each PR (10).
- Do not touch `electron/`, `src/platform/`, `src/demo/` or any sync/guide logic.

## Review Focus

1. **Hidden grades leak in the new Classes tile.** The blur and `aria-hidden` on grade numbers must survive the restyle. Task 4 Step 6 checks it in the browser.
2. **The tab bar or sticky Ask dock covers content or the focused field on phones** (WCAG focus-not-obscured). The last row of every screen and the Ask input stay visible at 375px. Task 3 Step 7 and Task 6 Step 3 check this.
3. **Dark theme regresses while light is tuned.** The contrast test in Task 1 checks both themes.
4. **Existing users lose their theme.** A stored `fd.theme` of `"dark"` must still load dark. Only first runs default to light. Task 1 Step 7 checks it.
5. **Long course names, 200% browser zoom and 375px width cause sideways scroll in bento tiles.** Every grid child needs `min-width: 0`. Task 9 checks it at 375px and 200% zoom.

## File map

| File | Change |
|---|---|
| `src/styles/tokens.css` | New palette (light becomes `:root`), new `--new*`, `--border-input`, `--r-*`, `--shadow-*`, font |
| `src/styles/tokens.test.js` | Update palette asserts, add contrast + font tests |
| `src/styles/ui.test.js` | **Create**: radius/shadow/min font-size rules for `ui.css` |
| `src/styles/ui.css` | Swept section by section in Tasks 2–8 |
| `src/main.jsx`, `package.json`, `index.html` | Font swap; `viewport-fit=cover` |
| `src/app/App.jsx` | Theme default `"light"`; mount `TabBar` |
| `src/shell/tabs.js` + `tabs.test.js` | **Create**: tab list + `activeTab(route)` |
| `src/shell/TabBar.jsx` | **Create**: phone bottom tab bar |
| `src/components/ui/index.jsx` | `Pill` tone `new`; `tiny` becomes 12px |
| `src/features/frontdoor/FrontDoorScreen.jsx` | Bento markup: Ask in header, grid areas, events tile |
| `src/features/frontdoor/homeView.js` + test | `homeEvents()` |
| `src/features/dev/UiGallery.jsx` | Show new tokens, the new tone and the radii |
| Screen JSX (Calendar, Course, Ask, Campus, Events, Map, Settings, Welcome) | Class name changes only where a task says so |

## Branch and PRs

Branch from `main`: `story/<issue#>-ui-redesign`, using the number of the issue opened for this work. Rule 10 asks for small PRs, so open three: **PR 1** Tasks 1–2 (foundation), **PR 2** Tasks 3–4 (shell + home), **PR 3** Tasks 5–9 (screens + checklist). Each PR lists "Shared files touched: src/styles, src/shell, src/components, src/app" and "New package: atkinson-hyperlegible-next (team agreed)".

---

### Task 1: Tokens, font and light default

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/tokens.test.js`, `src/main.jsx`, `package.json`, `src/app/App.jsx:31-33`

**Interfaces:**
- Produces: every token in the spec table, plus `--new`, `--new-text`, `--new-tint`, `--new-panel`, `--new-line`, `--border-input`, `--r-sm`, `--r-md`, `--r-lg`, `--r-full`, `--shadow-1`, `--shadow-2`, `--shadow-3`. Light is the `:root, :root[data-theme="light"]` block (first). Dark is `:root[data-theme="dark"]` (second).

- [ ] **Step 1: Rewrite the token tests (failing)** in `src/styles/tokens.test.js`. Flip the slices: `light` = text before `:root[data-theme="dark"]`, `dark` = from it on. Replace the palette, font and theme tests with:

```js
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
const lum = (h) => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

it("has the approved light palette as the default", () => {
  expect(token(light, "bg")).toBe("#F7F5F2");
  expect(token(light, "surface")).toBe("#FFFFFF");
  expect(token(light, "accent")).toBe("#9E1B32");
  expect(token(light, "new-text")).toBe("#7A4E00");
  expect(tokens.indexOf(':root[data-theme="dark"]')).toBeGreaterThan(tokens.indexOf(":root,"));
});

it("has a dark theme with the same names", () => {
  for (const name of ["bg", "surface", "text", "muted", "faint", "accent", "accent-text", "new", "new-text", "border-input", "shadow-1", "shadow-2", "shadow-3"]) expect(token(dark, name), name).toBeTruthy();
});

it.each([["light"], ["dark"]])("%s text passes 4.5:1 and input borders 3:1", (theme) => {
  const css = theme === "light" ? light : dark;
  for (const bg of ["bg", "surface", "surface-2"])
    for (const fg of ["text", "text-2", "muted", "faint", "accent-text", "new-text", "good-text"])
      expect(ratio(token(css, fg), token(css, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  expect(ratio(token(css, "on-fill") ?? "#FFFFFF", token(css, "accent"))).toBeGreaterThanOrEqual(4.5);
  expect(ratio(token(css, "border-input"), token(css, "surface-input"))).toBeGreaterThanOrEqual(3);
});

it("uses Atkinson Hyperlegible Next for words and Geist Mono for numbers", () => {
  expect(token(light, "font-sans")).toMatch(/^"Atkinson Hyperlegible Next Variable"/);
  expect(token(light, "font-mono")).toMatch(/^"Geist Mono"/);
});
```

`--on-fill` is only set in the light block, so the dark lookup falls back. Every token the contrast test reads must be a plain hex in both blocks.

- [ ] **Step 2: Run** `npx vitest run src/styles/tokens.test.js`. Expected: FAIL on the bg/accent/font asserts.

- [ ] **Step 3: Rewrite `tokens.css`** with the spec values. The light block comes first as `:root, :root[data-theme="light"] { color-scheme: light; … }` and holds **every** token: colors, course palette, fonts, `--r-*`, `--shadow-*`, `--ring`, `--ease`. The dark block `:root[data-theme="dark"] { color-scheme: dark; … }` overrides colors and shadows. The dark course palette (`--c1..c6` dots, tints, washes) keeps today's dark values. The light `--cN-dot/-tint/-wash` reuse today's dark dot values. `--ring: 0 0 0 4px var(--good-ring)` stays. Add `--ease` shadow: `background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease`.

- [ ] **Step 4: Swap the font.** `npm i @fontsource-variable/atkinson-hyperlegible-next@^5.3.0 && npm rm @fontsource/geist-sans`. In `src/main.jsx`, replace the four `geist-sans` imports with `import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";` and keep the three `geist-mono` imports.

- [ ] **Step 5: Light default.** In `src/app/App.jsx` `useTheme`, change `loadJson(THEME_KEY, "dark")` to `loadJson(THEME_KEY, "light")` and update the doc comment to `"light" (default), "dark" or "system"`.

- [ ] **Step 6: Run** `npm test`. Expected: all pass, including the hex-only and gradient tests.

- [ ] **Step 7: Check the stored theme.** `npm run dev`. In the devtools console run `localStorage.setItem("fd.theme", '"dark"')` and reload. Expected: dark loads. Run `localStorage.removeItem("fd.theme")` and reload. Expected: light loads.

- [ ] **Step 8: Commit** `git add -A && git commit -m "Redesign 1/9: Bento Campus tokens, Atkinson Hyperlegible, light by default"`

---

### Task 2: Foundation sweep of `ui.css` (base, type, components)

**Files:**
- Create: `src/styles/ui.test.js`
- Modify: `src/styles/ui.css` sections Base → Empty states (lines 1–325), Card heads, Shared layouts, Task lines; `src/components/ui/index.jsx` (`Pill`)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `<Pill tone="new">` (class `ui-pill--new`: `--new-tint` bg, `--new-text` text). Card class keeps its name. Tasks 3–8 rely on `.ui-card` having `--r-lg`, `--shadow-1`, padding 24/16.

- [ ] **Step 1: Write the failing rule test** `src/styles/ui.test.js`:

```js
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync(new URL("./ui.css", import.meta.url), "utf8");
const values = (prop) => [...css.matchAll(new RegExp(`${prop}:\\s*([^;]+);`, "g"))].map((m) => m[1].trim());

describe("ui.css follows the design system", () => {
  it("rounds corners only with radius tokens", () => {
    expect(values("border-radius").filter((v) => !/^(var\(--r-(sm|md|lg|full)\)|50%|0)$/.test(v))).toEqual([]);
  });
  it("uses only shadow tokens", () => {
    expect(values("box-shadow").filter((v) => !/^(var\(--shadow-[123]\)|var\(--ring\)|none)$/.test(v))).toEqual([]);
  });
  it("never sets text smaller than 12px", () => {
    expect(values("font-size").filter((v) => /px$/.test(v) && parseFloat(v) < 12)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/styles/ui.test.js`. Expected: FAIL, listing the current raw radii, the 3 raw shadows and the 11px sizes.

- [ ] **Step 3: Sweep the whole of `ui.css` for the three rules.** Map radii 4–9px → `--r-sm`, 10–12px → `--r-md`, 14–16px → `--r-lg`, 999px → `--r-full`. Map shadows → tokens, and 11px → 12px. This makes Step 1 pass. Later tasks change layout, not these rules.

- [ ] **Step 4: Restyle the base and components** to the spec:
  - Base: body 16/24. Placeholder color `--faint`. Focus ring `2px solid var(--accent-text)` offset 2 (unchanged).
  - Type: spec table, including the `< 600px` display and title sizes.
  - Button: `--r-md`, 40px tall (44 under 900px), sm 32px. Primary = `--accent` fill with `--on-fill` text, and on hover a new `--accent-fill-hover` fill (light `#82162A`, dark `#9E1B32`, both ≥ 7.9:1 with white). Secondary = `--surface` with a `--border-btn` border.
  - Card: `--surface`, `--r-lg`, `--shadow-1`, no border in light. Padding 24, or 16 under 600px. Gap 16.
  - Chip: `--r-full`, 36px (44 under 900px). Pressed = `--accent-tint` + `--accent-text`.
  - Pill: add `--new`, and `tiny` becomes 12px.
  - Inputs: `--border-input`, `--r-md`, 44px.
  - Rows: `--r-md`, hover `--surface-hover`. Link-cards (`a.ui-card`, `.campus-card`) hover `--shadow-2`.
  - Notice: `--r-lg`.

  Add `--accent-fill-hover` to both token blocks and to the dark-names test list.

- [ ] **Step 5: Add `new` to `Pill`** in `src/components/ui/index.jsx`: update the tone doc comment to `accent | good | warn | neutral | support | new` and `tiny` to 12px. No logic change.

- [ ] **Step 6: Run** `npm test && npm run build`. Expected: green.

- [ ] **Step 7: Look at it.** `npm run dev`, open `#/dev` (UiGallery), and check light and dark. Expected: crimson primary, white cards with soft shadow on off-white, Atkinson text, mono numbers.

- [ ] **Step 8: Commit** `"Redesign 2/9: components on radius, shadow and type tokens; no text under 12px"`, then **open PR 1**.

---

### Task 3: Shell: sidebar, phone tab bar, drawer, palette, title bar

**Files:**
- Create: `src/shell/tabs.js`, `src/shell/tabs.test.js`, `src/shell/TabBar.jsx`
- Modify: `src/app/App.jsx` (render `<TabBar route={route} />` after `</main>` inside `.app-main`), `index.html` (viewport), `ui.css` sections App shell, Title bar, Sidebar, Top bar and drawer, Command palette

**Interfaces:**
- Produces: `TABS: Array<{ key: "home"|"calendar"|"ask"|"campus"|"map", label: string, icon: string, href: string }>` and `activeTab(route: { name: string, parts: string[] }) => TabKey | null` from `src/shell/tabs.js`. `TabBar({ route })` renders `<nav className="tabbar" aria-label="Main tabs">`.

- [ ] **Step 1: Failing test** `src/shell/tabs.test.js`:

```js
import { describe, expect, it } from "vitest";
import { TABS, activeTab } from "./tabs.js";

describe("phone tabs", () => {
  it("has five tabs in order", () => {
    expect(TABS.map((t) => t.key)).toEqual(["home", "calendar", "ask", "campus", "map"]);
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Calendar", "Ask", "Campus", "Map"]);
  });
  it.each([
    [{ name: "home", parts: [] }, "home"],
    [{ name: "calendar", parts: [] }, "calendar"],
    [{ name: "ask", parts: [] }, "ask"],
    [{ name: "campus", parts: [] }, "campus"],
    [{ name: "campus", parts: ["clubs"] }, "campus"],
    [{ name: "campus", parts: ["r", "x"] }, "campus"],
    [{ name: "events", parts: [] }, "campus"],
    [{ name: "map", parts: [] }, "map"],
    [{ name: "course", parts: ["abc", "grades"] }, null],
    [{ name: "settings", parts: [] }, null],
  ])("%o → %s", (route, key) => expect(activeTab(route)).toBe(key));
});
```

- [ ] **Step 2: Run** `npx vitest run src/shell/tabs.test.js`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `tabs.js`.** Hrefs come from `routeHref`. Icons are `home`, `calendar`, `ask`, `book`, `map` (all already in `ICON_NAMES`). Then write `TabBar.jsx`: links with icon (22px, `aria-hidden`) + label and `aria-current="page"` on the active tab.

- [ ] **Step 4: Run** the test. Expected: PASS.

- [ ] **Step 5: Shell CSS.**
  - `.app-side` is 240px. `.sb` uses `--bg-sidebar` with a `--sidebar-line` border.
  - `.sb-item[aria-current="page"]` gets `--accent-tint` bg and `--accent-text` color. `.sb-mark` is the crimson fill.
  - `.sb-icon-btn` is 36px.
  - `.page` gets `max-width: 1240px` with padding 32/40 desktop, 24 at 600–899px and 16 under 600px.
  - `.tabbar` is `display: none` at 900px and up. Under 900px it is `position: sticky; bottom: 0` inside `.app-main` (flex: none, so it never overlaps the scroller). It has a 5-column grid, a 64px height plus `padding-bottom: env(safe-area-inset-bottom)`, a `--surface` bg and a `--divider` top border. Items are ≥ 44×44 with 12px labels. The active item uses `--accent-text`.
  - The drawer gets `--shadow-3` and `--r-lg` on its right corners. The palette gets `--r-lg`, `--shadow-3` and `top: 12vh`, and is full width minus 16px under 600px.
  - In `index.html`, set the viewport to `width=device-width, initial-scale=1.0, viewport-fit=cover`.

- [ ] **Step 6: Run** `npm test && npm run build`. Expected: green.

- [ ] **Step 7: Phone check.** `npm run dev`, devtools 375×667. Expected: the tab bar shows, the active tab matches the route, and scrolling to the bottom of Home and Campus shows the last card fully above the tab bar. Tab through the page: no focused element hides under the bar. At 1280px: no tab bar, the sidebar active item is crimson-tinted.

- [ ] **Step 8: Commit** `"Redesign 3/9: shell restyle and phone tab bar"`

---

### Task 4: Home bento

**Files:**
- Modify: `src/features/frontdoor/FrontDoorScreen.jsx`, `src/features/frontdoor/homeView.js`, `src/features/frontdoor/homeView.test.js`, `ui.css` section Home

**Interfaces:**
- Consumes: `useCampusEvents()` → `{ status, events, stale, down }`. `interestsOf(text)` from `clubs/sourceClubs.js`. `eventTime(iso)` from `campus/campusEvents.js`. `<Pill tone="new">`.
- Produces: `homeEvents(events: Event[], interests: string[], n = 3) => Event[]`. It puts events whose `interestsOf(e.text)` meets `interests` first, then the rest, keeping input (date) order inside each group, and returns `n` at most. Each returned event gets a `match: string[]` field.

- [ ] **Step 1: Failing test** in `homeView.test.js`:

```js
import { homeEvents } from "./homeView.js";
describe("homeEvents", () => {
  const ev = (id, text) => ({ id, text, start: `2026-11-0${id}T18:00:00` });
  const list = [ev(1, "Chess night"), ev(2, "Coding club hack night"), ev(3, "Open mic"), ev(4, "Robotics coding workshop")];
  it("puts your interests first, keeps date order, caps at n", () => {
    expect(homeEvents(list, ["coding"], 3).map((e) => e.id)).toEqual([2, 4, 1]);
  });
  it("falls back to date order with no interests", () => {
    expect(homeEvents(list, [], 2).map((e) => e.id)).toEqual([1, 2]);
  });
  it("handles no events", () => expect(homeEvents([], ["coding"])).toEqual([]));
});
```

Before writing it, check that `interestsOf("Coding club hack night")` returns a key that includes `"coding"` (run it in the vitest REPL or read `sourceClubs.js`). Use whatever key it really returns in both the fixture and the assertions.

- [ ] **Step 2: Run** `npx vitest run src/features/frontdoor/homeView.test.js`. Expected: FAIL (not exported).

- [ ] **Step 3: Implement `homeEvents`** in `homeView.js`.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Restructure `FrontDoorScreen`:**
  - **Header** (`page-head home-head`): h1 greeting, subtitle, then the Ask form moved out of `AskCard`. It becomes `home-askbar`: a label, an input and the Ask button `size="lg"`, followed by the chips (3 suggestions at most). Delete the `AskCard` card.
  - **Grid:** `<div className="home-bento">` with children in this order: `Tonight` (`home-tile--tonight`), `ClassesCard` (`--classes`), `ThisWeek` (`--week`), `HelpCard` (`--help`) and a new `EventsCard` (`--events`).
  - **`EventsCard`:** heading "On campus this week", up to 3 items from `homeEvents(events, interests)`. Each item shows its title, `eventTime(start)` and a `<Pill tone="new" tiny>For you</Pill>` when `match.length`. The card ends with `TextLink href={routeHref("events")} arrow` "All events". It shows a skeleton while `status === "loading"` and "Nothing on the list right now." when empty or on error.
  - **`GradeRow`:** the "New grade" pill becomes `tone="new"`.
  - **`HomeSkeleton`:** same 5 tiles, same areas.
  - **CSS:** `.home-bento { display: grid; gap: 24px; align-items: stretch; }` with the three column/area sets from the spec table (gap 20 at 900–1199px, 16 under 900px). `.home-bento > * { min-width: 0; }`. `.home-askbar` is a flex row that wraps under 600px, where the button goes full width. Delete the `.home-left`/`.home-right` rules. The featured task gets `--r-lg` and a `--accent-panel` bg with an `--accent-line` border.

- [ ] **Step 6: Privacy and layout check.** `npm run dev` (demo), Home:
  - Grade numbers are blurred, a screen reader reads "Grade hidden", and Show grades reveals them.
  - The tile order is the same at 1440, 1024 and 375px, with no sideways scroll at 375px.
  - The "New grade" pill is gold in both themes.

- [ ] **Step 7: Run** `npm test && npm run build`. Expected: green.

- [ ] **Step 8: Commit** `"Redesign 4/9: bento home with Ask bar and campus events tile"`, then **open PR 2**.

---

### Task 5: Calendar and Course

**Files:** Modify `ui.css` sections Calendar, Course page, Assignments, Announcements, Content, Grades. Add `className` hooks in `CalendarView.jsx` only if the stacked phone list needs one.

- [ ] **Step 1: Calendar.**
  - The week grid sits in a card. Today uses `--today-bg`/`--today-line`.
  - Under 600px, `.cal-grid` becomes one column: each day is a row with the day name on the left and its items on the right.
  - `.cal-nav` buttons are 44px under 900px.
- [ ] **Step 2: Course.**
  - The header wash gradient stays exactly as it is.
  - `.course-tabs` gets a `--divider` bottom border. `.course-tab[aria-current]` (or the selected selector it uses today) gets a 2px `--accent` underline via `border-bottom` and `--text` color. The tabs scroll sideways under 600px (`overflow-x: auto`, `scrollbar-width: none`). Each tab is 44px tall.
  - Grade tables keep `.table-wrap`.
  - Every grade/progress number stays `.num`.
- [ ] **Step 3: Check** at 375 and 1280px in both themes, then run `npm test && npm run build`. Expected: green, no sideways page scroll (the tab row scrolling by itself is fine).
- [ ] **Step 4: Commit** `"Redesign 5/9: calendar and course pages"`

### Task 6: Ask (the guide)

**Files:** Modify `ui.css` section Ask. No change to `AskScreen.jsx` logic, `copy.js` or `matcher.js`.

- [ ] **Step 1: Restyle.**
  - `.ask-thread` gets `max-width: 760px; margin: 0 auto`.
  - Resource answers (`.ask-res`) become cards with `--r-lg` and `--shadow-1`.
  - `.ask-crisis` gets a `--warn-panel` bg and `--warn-line` border. `.ask-private` gets `--support-bg`.
  - `.ask-crisis-btn.is-call` is the screen's one filled button. It may use `--accent`.
  - `.ask-dock` is `position: sticky; bottom: 0` with a `--surface` bg, a `--shadow-2` and a `--divider` top border.
- [ ] **Step 2: Run** `npx vitest run src/features/guide`. Expected: the matcher guardrail tests pass, unchanged.
- [ ] **Step 3: Phone check** at 375px: type in the dock. The input stays visible above the tab bar and the on-screen keyboard (devtools, device mode). The last answer can scroll fully above the dock.
- [ ] **Step 4: Commit** `"Redesign 6/9: guide screen"`

### Task 7: Resources, Clubs, Events, Map

**Files:** Modify `ui.css` sections Campus, Campus map. `EventsScreen.jsx` gets `tone="new"` for a "For you" match pill if it currently shows one with another tone.

- [ ] **Step 1: Card grids.**
  - `.campus-grid` and `.campus-club-grid` use `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, with gap 24 (16 under 900px).
  - `.campus-card` and `.campus-club` use the card look and hover to `--shadow-2`.
  - `.campus-search` is a 44px input with a leading icon.
- [ ] **Step 2: Detail sheet.**
  - At 900px and up, `.campus-detail` is a right sheet 440px wide with `--shadow-3` and `--r-lg` on its left corners.
  - Under 900px it is full screen with `.campus-close` visible at 44px.
  - `.campus-scrim` uses `--scrim`.
  - Check that Esc and the Close button both close it, and that focus returns to the card that opened it (fix in `CampusScreen.jsx` only if it doesn't).
- [ ] **Step 3: Map.**
  - `.map-body` uses `grid-template-columns: minmax(0, 1fr) 360px` at 900px and up, and one column under that (map first).
  - The map frame gets `--r-lg`. The map stroke and fill colors keep their tokens.
  - `.map-zoom` buttons are 44px.
- [ ] **Step 4: Run** `npm test && npm run build`, then check 375/1024/1440 in both themes. Expected: green, no sideways scroll.
- [ ] **Step 5: Commit** `"Redesign 7/9: campus, clubs, events and map"`

### Task 8: Settings, Welcome, connections dialog, UI gallery

**Files:** Modify `ui.css` sections Settings, Welcome, Dev gallery, and "Settings, Connections, and the confirm-before-sending dialog". Modify `UiGallery.jsx`.

- [ ] **Step 1: Settings.**
  - `.set-page` is single column with `max-width: 760px`, one card per group.
  - `.set-switch` is a 44×24 toggle hit area (44 tall under 900px), with `--accent` when on.
  - The theme segmented control lists Light, Dark, System in that order. Change the options array order in `SettingsScreen.jsx` if needed.
- [ ] **Step 2: Welcome.** `.welcome-grid` uses `repeat(auto-fill, minmax(260px, 1fr))` and `.welcome-card` uses the card look with hover `--shadow-2`.
- [ ] **Step 3: Confirm dialog** (`ConfirmSend`). It gets `--r-lg` and `--shadow-3`, and sits as a bottom sheet under 600px. Its copy and buttons don't change (rule 5).
- [ ] **Step 4: UiGallery.** Add swatches for `--accent`, `--new`, `--good`, `--warn` and `--support`, the 4 radii, the 3 shadows, `Pill tone="new"` and the type scale.
- [ ] **Step 5: Run** `npm test && npm run build`. Expected: green. **Commit** `"Redesign 8/9: settings, welcome, confirm dialog, gallery"`

### Task 9: Pre-delivery checklist and PR 3

- [ ] **Step 1: Leftover sweep.** Search `ui.css` for `#`, `rgba(`, `px solid` borders using raw colors, and for `.home-left`/`.home-right` or any other class no JSX uses any more (grep each removed class in `src/`). Delete the dead rules.
- [ ] **Step 2: Skill checklist.** Go through the ui-ux-pro-max Pre-Delivery Checklist (`references/pro-rules.md`) and quick-reference §1–§3 on every route (`#/`, `#/calendar`, `#/ask`, `#/campus`, `#/campus/clubs`, `#/events`, `#/map`, `#/course/<id>/overview|grades|assignments`, `#/settings`, welcome) at 375, 768, 1024 and 1440px, in light and dark, with the OS reduced-motion setting on and with browser zoom at 200%. Record any failure as a fix commit.
  - No sideways scroll at 375px or at 200% zoom.
  - Every interactive element is ≥ 44px under 900px.
  - Focus is visible everywhere and never hidden by the tab bar, dock or sheet.
  - One filled button per screen.
  - Gold is only used for "new".
- [ ] **Step 3: Electron.** Run `npm run electron:dev`. The title bar drag strip and the window buttons work on the light background, and the close-button hover is crimson. (Live data on screen is fine to look at, but screenshots come from demo only, per rule 6.)
- [ ] **Step 4: Screenshots** in demo mode: Home at 1440 and 375px in light and dark, for the PR.
- [ ] **Step 5: Run** `npm test && npm run build`. Expected: green. **Commit** `"Redesign 9/9: checklist fixes"` and **open PR 3**.
