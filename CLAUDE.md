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
3. Never log or print Blackboard cookies, tokens, or a student's grades.
4. Grades and course data never leave the student's computer. They are never sent to the AI guide and never sent to any shared server.
5. No logins, scraping or network calls to Okta, myBama or any other UA system. No LLM calls. One exception: the desktop app may read The SOURCE's **public** club list, signed out and **GET only**, from `electron/sourceClubs.cjs` alone. It never sends cookies, a login, or anything about the student. Only the tech lead changes that file.
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
