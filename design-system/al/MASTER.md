# AL design system

Source of truth for the UI. First written for the 2026-11-04 redesign; revised 2026-11-13 to a flat, professional look: hairline borders instead of shadows, crisp corners, lists instead of card grids, no decorative motion. `src/styles/ui.test.js` and `src/styles/tokens.test.js` enforce the "Avoid" list at the end.

Hand written, not generated: the skill's `--design-system` output picked an off-brand teal palette for "university", so the palette here is UA crimson, and every text pair below was checked with the WCAG formula.

## Principles

1. **Light first, dark as a choice.** New installs open in light. A stored choice (`fd.theme`) is kept.
2. **One crimson.** UA crimson `#9E1B32` is the only brand fill. One filled (primary) button per screen, as before.
3. **Gold means new.** New grades, new posts and new events use the gold "new" tone and nothing else.
4. **Flat surfaces, hairline borders.** Cards are white on warm off-white with a 1px `--border`. Nothing at rest has a shadow; only overlays (drawer, palette, phone sheets, dialogs) get `--shadow-3`.
5. **Read at a glance.** Body text is 16px Atkinson Hyperlegible Next. Nothing is smaller than 12px.
6. **Same order everywhere.** DOM order = visual order at every breakpoint, so keyboard and screen reader order match what you see.

## Color tokens (values for `src/styles/tokens.css`)

Every existing token name stays. New names are marked **new**.

| Token | Light (default) | Dark |
|---|---|---|
| `--bg` | `#F7F5F2` | `#151312` |
| `--bg-dot` | `#DCD6CE` | `#2C2724` |
| `--bg-sidebar` | `#FFFFFF` | `#110F0E` |
| `--surface` | `#FFFFFF` | `#1D1A18` |
| `--surface-2` | `#F3F0EC` | `#26221F` |
| `--surface-input` | `#FFFFFF` | `#1A1716` |
| `--surface-hover` | `#FAF8F6` | `#221F1C` |
| `--hover` | `#EFEBE6` | `#2C2825` |
| `--border` | `#E6E2DC` | `#34302C` |
| `--border-strong` | `#DAD5CE` | `#3B3632` |
| `--border-btn` | `#CFC9C1` | `#4A443F` |
| `--border-hover` | `#B5AEA6` | `#5A534D` |
| `--border-input` **new** | `#8F877F` | `#7A726A` |
| `--divider` | `#EFEBE6` | `#2A2623` |
| `--sidebar-line` | `#E6E2DC` | `#262220` |
| `--track` | `#E6E2DC` | `#2C2825` |
| `--scrim` | `rgba(28, 25, 23, 0.40)` | `rgba(0, 0, 0, 0.60)` |
| `--on-fill` | `#FFFFFF` | `#FFFFFF` |
| `--text` | `#1C1917` | `#F3F0EC` |
| `--text-2` | `#44403C` | `#DDD7D0` |
| `--muted` | `#57534E` | `#B8B0A7` |
| `--faint` | `#6B645D` | `#9C948B` |
| `--accent` (fill) | `#9E1B32` | `#B3243D` |
| `--accent-text` | `#9E1B32` | `#F28B9C` |
| `--accent-hover` | `#7A1426` | `#F7A8B5` |
| `--new` **new** (fill/dot) | `#C98A1B` | `#E9B65A` |
| `--new-text` **new** | `#7A4E00` | `#E9B65A` |
| `--good-text` | `#1F6B3A` | `#7FCB97` |
| `--support` | `#2F5FA8` | `#7BA7E8` |

Tints follow one rule, from the base color: `-tint` 10%, `-panel` 6%, `-line` 30% alpha (`--accent-*`, `--new-*`, `--good-*`, `--warn-*`, `--support-*`). `--today-bg` = accent at 8%, `--today-line` = accent at 30%. Course palette `--c1..c6` keeps its dots; light `-text` values stay as they are today.

Checked contrast (all ≥ 4.5:1 text, ≥ 3:1 input borders): light text 16.1, muted 7.0, faint 5.4, accent-text 7.3, new-text 6.6 on `--bg`; white on crimson 7.9. Dark text 15.2, muted 8.1, faint 5.8, accent-text 7.4, new-text 9.3 on `--surface`; white on dark accent 6.5. Input borders 3.5 (light) and 3.8 (dark).

## Shape and depth tokens (new)

| Token | Value | Use |
|---|---|---|
| `--r-sm` | `4px` | chips, pills, kbd, small icon buttons, step numbers |
| `--r-md` | `6px` | buttons, inputs, rows, nav items |
| `--r-lg` | `8px` | cards, list panels, sheets, palette, dialogs |
| `--r-full` | `999px` | dots and toggles only |
| `--shadow-3` light | `0 12px 32px rgba(28,25,23,.16)` | overlays only: palette, drawer, phone sheets, dialogs |
| `--shadow-3` dark | `0 12px 32px rgba(0,0,0,.5)` | |

Rule: `border-radius` in `ui.css` uses only `var(--r-*)` or `50%`. `box-shadow` is `var(--shadow-3)` or `none`. Hover changes background or border color instantly, never size, position or shadow.

## Type

- Words: **Atkinson Hyperlegible Next** (variable, `@fontsource-variable/atkinson-hyperlegible-next`), `--font-sans: "Atkinson Hyperlegible Next Variable", system-ui, sans-serif`.
- Numbers: Atkinson with tabular figures (`.num`). Course codes and keys: the system monospace (`--font-mono`: `ui-monospace`, Cascadia Mono, SF Mono, Menlo, Consolas). No font package for it.
- Never Inter, Geist or Space Grotesk.
- Icons: our own set in `src/components/ui/Icon.jsx` (20 unit grid, 1.5 stroke, square ends, sharp joins). No Lucide, no icon packages, no sparkles.

| Class | Desktop | Under 600px |
|---|---|---|
| `.t-display` | 32/40, 700, −0.01em | 28/36 |
| `.t-title` | 22/28, 700 | 20/26 |
| `.t-heading` | 18/24, 700 | same |
| body (`body`) | 16/24, 400 | same |
| `.t-body-lg` | 17/26 | same |
| `.t-small` | 14/20 | same |
| `.t-label` | 13/18, 600 | same |
| smallest allowed | 12/16 | same |

## Spacing and layout

- 4/8 rhythm only: 4, 8, 12, 16, 24, 32, 48.
- Page: `max-width: 1240px`, padding 32/40 desktop, 24 tablet, 16 phone.
- Card padding: 24 desktop, 16 phone. Grid gaps: 16 phone, 20 tablet, 24 desktop.
- Breakpoints (unchanged names): phone `< 600`, tablet `600–899`, small desktop `900–1199`, desktop `≥ 1200`.

### Shell

- **≥ 900:** icon rail (68px, `--bg-sidebar`, hairline right border). Courses show a 4-letter code tile (`railCode`). Names are visually hidden for screen readers and shown in a dark label on hover or keyboard focus. Active item = `--accent-tint` fill + `--accent-text` icon. The drawer under 900px keeps full labels.
- **Backdrop:** every page sits on `--bg` with a faint 24px dot grid (`body::before`, an SVG mask filled with `--bg-dot`). No photos, no gradients.
- **< 900:** top bar (56px) with menu, brand and search, plus a **bottom tab bar** (64px + `env(safe-area-inset-bottom)`): Home, Calendar, Ask, Campus, Map. The drawer still holds everything (courses, clubs, events, settings). `.app-scroll` gets bottom padding equal to the tab bar so nothing hides behind it.
- Targets: 44×44 under 900px, at least 32×32 on desktop (above the WCAG 24px floor).

### Home

The header holds the greeting, the subtitle and a full-width **Ask bar** (input + Ask button + 3 chips). Below it, two columns (`minmax(0,7fr) minmax(0,5fr)`):

- **Left**, in DOM order: Campus resources, How classes are going, Tonight, This week, On campus this week (a divided list, not tiles).
- **Right**: the campus map preview (`src/features/map/MapPreview.jsx`, lazy loaded), sticky. The whole card links to `#/map`.
- **Under 900px**: one column, map last, so resources stay first.

### Other screens

| Screen | Layout |
|---|---|
| Calendar | Week grid in a card; under 600px the days stack as a list (one day per row). |
| Course | Flat header with a hairline bottom border; the course dot carries the color. Tabs are an underline row: crimson 2px underline on the active tab, horizontally scrollable under 600px. `.split` 3:2 stays. |
| Ask | Thread column `max-width: 760px`, centered. The dock is sticky at the bottom and sits above the tab bar under 900px. Crisis and sensitive blocks keep their wording and get `--warn-panel`/`--support-bg` cards. |
| Resources / Clubs / Events | One bordered list panel per section with divided rows (`.campus-grid`, `.campus-club-grid`), never rows of feature cards. Resource detail = right panel at ≥ 900, bottom sheet under 900, with a visible Close button and Esc. |
| Map | `map-body` `minmax(0,1fr) 360px` at ≥ 900; map first, then panel, under 900. |
| Settings | Single column, `max-width: 760px`, one card per group. |
| Welcome | Centered card grid, `repeat(auto-fill, minmax(260px, 1fr))`. |
| Command palette | `--r-lg`, `--shadow-3`, top 12vh, full width minus 16px on phones. |

## Motion

- Hover and pressed states change instantly: no `transition`, no transform, no animation on hover.
- The only motion: the drawer slides in (200ms), the palette and route change fade in (120ms), the syncing dot pulses. The reduced-motion rules turn all of it off.
- Loading is one plain line (`<Loading />`, "Loading…"), never skeleton shapes.

## Avoid

Checked by tests where a test can check it:

- Gradients of any kind, radial orbs, glows.
- Drop shadows on anything at rest (cards, inputs, pins, segmented buttons).
- Soft corners: no radius over 8px, no pill shapes except dots and toggles.
- Bento grids, and rows of three feature cards. Use lists in one panel.
- Colored left stripes on cards or rows.
- Inter, Geist and Space Grotesk. Lucide or any icon package. Sparkle icons.
- Skeleton loaders.
- Hover animations, animated or decorative text arrows (no trailing "→" on links).
- Emoji, and em dashes in UI copy.
- Also still: teal or blue brand fills, more than one filled button per screen, gold for anything but "new", text under 12px, layout shift on hover.
