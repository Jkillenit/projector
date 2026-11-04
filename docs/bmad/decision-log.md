# BMAD decision log

Add a line whenever we change or reject BMAD output. Newest at the bottom.

| Date | What BMAD said | What we did | Why |
|---|---|---|---|
| 2026-11-03 | UI redesign brief | UI redesign: calm dark system, one primary per screen, grades inside courses, grades hidden by default. | One clear next step per screen; grades are sensitive, so Home blurs them until the student asks. |
| 2026-11-04 | Connect The SOURCE for real club data (#16) | Rule 5 now allows one signed-out, GET-only read of The SOURCE's public club list from `electron/sourceClubs.cjs`. Demo mode keeps the made-up clubs. | The public list needs no login, so no UA account or student data is involved. The SOURCE has no meeting times, so the free-time badge only shows for demo clubs. |
| 2026-11-04 | Show upcoming campus events (#27) | The rule 5 exception now covers The SOURCE events and UA's public calendar (`calendar.ua.edu`), in `electron/publicFeeds.cjs` (renamed from `sourceClubs.cjs`). | Clubs don't always post events on The SOURCE, so UA's calendar is a second source. Both are public, need no login, and get no student data. |
