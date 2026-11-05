# CLAUDE.md: Projector

## What this is

Projector is a student starting point for The University of Alabama: sign in once, see what is due, what is new, and which campus resource fits you right now. An AI guide matches you to tutoring, clubs and services and shows the exact steps to get in.

It is a class project for MIS 430 (four senior MIS majors). It is a **mockup**. The guide is scripted rules, not a live AI. The web version runs on **made-up demo data**. It was started from a personal study app called Study Hub.

## Two modes, one codebase

- **Demo mode**: plain browser. `src/platform/demoBridge.js` installs `window.studyHub` from `src/demo/` only when it is missing. This powers the GitHub Pages link, phone testing and class demos. No real grades are ever on screen.
- **Live mode**: the Electron desktop app. The student signs in on Blackboard's own page, and the app reads their courses through Blackboard's read only API into a local SQLite database. This is the real product.

## Rules

1. Work only in your own feature folder (`src/features/<your slice>/`). Changes to `src/shell`, `src/platform`, `src/demo`, `electron/` or shared CSS need a note in the PR.
2. Blackboard code lives only in `electron/bbSync.cjs` and `electron/blackboardWindow.cjs`. It is **GET only**. Never add a request that posts, submits, uploads or changes anything on Blackboard. Only the tech lead changes these files.
3. Never log or print cookies, tokens or passwords for Blackboard or any connection, or a student's grades.
4. Grades and course data never leave the student's computer. They are never sent to the AI guide, a connection, or any shared server.
5. Other systems (UA's and outside apps) are reached only in these two ways. No LLM calls.
   - **Public data, signed out:** GET only, from `electron/publicFeeds.cjs` alone (The SOURCE clubs and events, UA's calendar). It never sends cookies, a login, or anything about the student.
   - **Connections, with the student's own login:** myBama, tutoring booking, student tickets, Waze, What's the Move and the like. Each one is **off until the student turns it on** in Settings, Connections. The student signs in on that service's own page in an app window, the way Blackboard works. The app never asks for, sees or stores a password.
     - Once connected, the app may read what the student can see there.
     - Anything that sends, books, buys or changes something happens only when the student taps a button for that **one action** and confirms what will be sent. Never in the background, never in bulk, never on a timer.
     - Send only what that action needs. Grades and course data are never sent (rule 4).
     - Disconnect signs out and deletes everything saved from that service.
     - Check the service's terms first. If they ban automated access, use their official API or partner program, or do not build it.
     - Each connection lives in its own file in `electron/connections/`, and only the tech lead changes those files. Blackboard stays GET only (rule 2).
     - **One UA account:** Blackboard and the UA connections (like myBama) are one sign-in, stored in Blackboard's `persist:blackboard`. Connecting either turns on both; Disconnect on either turns off both. The second one connects in a hidden window using the sign-in the student just made, never with a second password. Outside services each get their own sign-in store.
6. Tests, demos and screenshots use Demo mode only.
7. Never write code that drafts or completes coursework.
8. No new npm package without team agreement in the PR.
9. Pure logic gets a vitest test. Screens do not need one.
10. One story per branch: `story/<number>-<short-name>`. Small PRs. `npm test` and `npm run build` must pass before you open one.
11. Keep the guardrails in `src/features/guide/matcher.js` and their tests. Do not weaken them without the safety lead's review.
12. Plain UI copy: short sentences, everyday words.
13. Do not renumber or delete database migrations in `electron/database.cjs`, even for tables we no longer use.

## Commands

- `npm run dev`: browser, Demo mode
- `npm test`, `npm run build`: must be green before a PR
- `npm run electron:dev`: build and open the desktop app (Live mode)
- `npm rebuild better-sqlite3`: make the database module work for tests (Node)
- `npm run rebuild`: make it work for the desktop app (Electron)

## Slices

| Folder | Owner role |
|---|---|
| `src/features/frontdoor/` | Tech lead |
| `src/features/resources/` | Requirements lead |
| `src/features/guide/` | Process and safety lead |
| `src/features/clubs/` | Users and change lead |
| `src/features/campus/` | Shared screen: Resources part is the requirements lead, Clubs part is the users and change lead. List it under "Shared files touched" in the PR |
