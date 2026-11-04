# BMAD decision log

Add a line whenever we change or reject BMAD output. Newest at the bottom.

| Date | What BMAD said | What we did | Why |
|---|---|---|---|
| 2026-11-03 | UI redesign brief | UI redesign: calm dark system, one primary per screen, grades inside courses, grades hidden by default. | One clear next step per screen; grades are sensitive, so Home blurs them until the student asks. |
| 2026-11-04 | Connect The SOURCE for real club data (#16) | Rule 5 now allows one signed-out, GET-only read of The SOURCE's public club list from `electron/sourceClubs.cjs`. Demo mode keeps the made-up clubs. | The public list needs no login, so no UA account or student data is involved. The SOURCE has no meeting times, so the free-time badge only shows for demo clubs. |
| 2026-11-04 | Show upcoming campus events (#27) | The rule 5 exception now covers The SOURCE events and UA's public calendar (`calendar.ua.edu`), in `electron/publicFeeds.cjs` (renamed from `sourceClubs.cjs`). | Clubs don't always post events on The SOURCE, so UA's calendar is a second source. Both are public, need no login, and get no student data. |
| 2026-11-04 | Rule 5: no calls to UA systems | Rule 5 now allows opt-in **connections** with the student's own login (myBama, tutoring booking, tickets, Waze, What's the Move). Each is off by default, signs in on the service's own page, sends or books only on a confirmed tap for one action, never sends grades, and disconnect deletes its data. Public signed-out feeds stay as they were. Blackboard stays GET only. | The ultimate campus map (#43) needs booking a tutor, tickets and live data the student already has access to. The student's own login and choice keep it their action, not ours. |
| 2026-11-04 | One sign-in per connection | myBama now shares Blackboard's UA sign-in (`persist:blackboard`). Connect finishes with no window when the student is already signed in to UA. Otherwise the window closes by itself once Week at a Glance shows. Disconnect myBama clears only Banner's sites; Disconnect Blackboard turns myBama off too. | Jack: students should not sign in to UA more than once. Both use the same UA (Okta) login. |
