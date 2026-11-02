# Projector

Codename: **Project Projector**.

A student starting point for UA: sign in once, see what is due, what is new, and which campus resource fits you right now. An AI guide (scripted, for now) matches you to tutoring, clubs and services and shows the exact steps to get in.

This is an MIS 430 class project and an interactive **mockup**. The web version uses made-up demo data. The guide uses rules, not a live AI.

**Live demo:** https://jkillenit.github.io/projector/

## Two modes

| Mode | How to run | Data |
|---|---|---|
| Demo | `npm run dev`, or the live link | Made-up students in `src/demo/` |
| Live | `npm run electron:dev` (desktop app) | The student's own Blackboard, read only, stored on their computer |

The badge in the top bar says **Demo** or **Live**.

## Setup

```bash
npm install
npm run dev        # browser, Demo mode
npm test
npm run build
```

### Desktop app (Live mode)

```bash
npm run rebuild        # build better-sqlite3 for Electron (once, after npm install)
npm run electron:dev   # build the web app and open it in Electron
```

If the desktop app crashes on start with `Cannot read properties of undefined (reading 'getPath')`, your terminal has `ELECTRON_RUN_AS_NODE` set (some editors set it). Unset it first: `unset ELECTRON_RUN_AS_NODE` (PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`).

### Tests and the database module

`better-sqlite3` is built for either Node or Electron, not both.

- Before `npm test`: `npm rebuild better-sqlite3`
- Before the desktop app: `npm run rebuild`

If the module is built for the other one, the tests that need it are skipped with a message, and everything else still runs.

### Mac setup

Teammates on a Mac may need Apple's command line tools if `better-sqlite3` has no prebuilt file for their machine:

```bash
xcode-select --install
```

Then run `npm install` again. Windows builds need no extra step. The demo never needs any of this.

## Folder map

| Path | What is in it |
|---|---|
| `src/app/` | App shell and screen switching |
| `src/shell/` | Left rail, search palette, ask bar |
| `src/platform/` | Demo bridge (`window.studyHub` for the browser) and the profile store |
| `src/demo/` | Demo data: students, courses, assignments, resources, clubs |
| `src/features/frontdoor/` | Home: due soon, new grades, picked for you |
| `src/features/resources/` | Directory, search, how to get in |
| `src/features/guide/` | Ask screen and the scripted matcher (`matcher.js`) |
| `src/features/clubs/` | Club list and matching |
| `src/features/today/`, `grades/`, `dashboard/`, `mirror/` | Due list, grades, calendar, course pages (from Study Hub) |
| `electron/` | Desktop app: window, local database, read only Blackboard sync |
| `docs/bmad/` | BMAD output and the decision log |

## Slice owners

| Slice | Owner |
|---|---|
| frontdoor | Tech lead |
| resources | Requirements lead |
| guide | Process and safety lead |
| clubs | Users and change lead |

Team rules are in [CLAUDE.md](CLAUDE.md). How to contribute is in [CONTRIBUTING.md](CONTRIBUTING.md).

---

Built from Study Hub by Jack Killen.
