# Contributing

## Flow

1. Pick a story (a GitHub issue). One story per branch.
2. Branch from `main`: `story/<number>-<short-name>`, for example `story/4-fuzzy-search`.
3. Work in your own slice folder. If you touch `src/shell`, `src/platform`, `src/demo`, `electron/` or shared CSS, say so in the PR.
4. Before you open a PR: `npm test` and `npm run build` pass. Pure logic has a test.
5. Open a small PR. Fill in the template: story number, acceptance criteria, screenshots (Demo mode only), BMAD changes.
6. One teammate reviews and approves. The test check must pass. Then merge.

## Rules that are not negotiable

- No real logins, scraping, LLM calls or calls to UA systems. Blackboard code stays in `electron/bbSync.cjs` and `electron/blackboardWindow.cjs`, GET only, tech lead only.
- Never log or print Blackboard cookies, tokens or a student's grades.
- Grades never go to the AI guide or any shared server.
- Never write code that drafts or completes coursework.
- Do not weaken the guardrails in `src/features/guide/matcher.js` without the safety lead's review.
- No new npm package without team agreement in the PR.
- Never commit real floor plans, real indoor data or real interior photos. They load from a folder on the student's own computer, in Live mode only. Demo mode uses made up buildings, like Demo Hall. Treat any plan UA gives us as private.

## BMAD rule

BMAD output goes in `docs/bmad/`. When you **change or reject** BMAD output, add a line to `docs/bmad/decision-log.md`: date, what BMAD said, what we did, why. A PR that changes BMAD output without a log line is not ready.

## Writing UI copy

Short sentences. Everyday words. Say what will happen before it happens.
