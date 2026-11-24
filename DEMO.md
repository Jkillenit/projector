# AL demo script

Demo Day: Monday, November 30. Present in Demo mode (`npm run dev` or the GitHub Pages link) as **Maya**. Everything on screen is made-up demo data.

The full 7-step path, what is real and what is mocked, and how to reset come in #219.

## Ask lines

Type these in Ask exactly as written. The guide is scripted rules, not a live AI, so each line gets the same answer every time. A test (`src/features/guide/demoScript.test.js`) reads this table and fails if an answer changes. If you change a line here, run `npm test`.

The line marked **main** is the one we use in the demo path. It must not mention stress, anxiety or feeling overwhelmed: those words send the guide to the Counseling Center on purpose, which is the right answer for a real student but not the tutoring demo.

| Line | Answer | First card |
|---|---|---|
| I'm failing 126 (**main**) | course | MATH 126 |
| Study help before my MATH 126 exam | course | MATH 126 |
| I'm failing 101 | which_course | ENGL 101, CH 101, PSY 101 |
| I'm failing 221 | course_none | MATH 126 |
| Someone to read my ENGL 101 essay | matched | writing-center |
| I need help with my essay | matched | writing-center |
| Find a club for coding | matched | org-midnight-coders |
| How do I get extra time on exams? | sensitive | disability-services |
| I'm not okay and I don't know who to talk to. | crisis | 988 |
| Who do I talk to about a late drop refund? | not_sure | directory |

What the answers mean:

- **course**: that class's tutoring (when, where, how to sign up, Show on map), then tutoring for any class. First card is the class.
- **which_course**: "Which one?" with a chip for each of Maya's classes with that number.
- **course_none**: the class is not one of Maya's, so AL lists the classes that have tutoring (first card is the first chip), then tutoring for any class.
- **matched**: one to three campus resources or clubs. First card is the top one.
- **sensitive**: one official office, and nothing is saved.
- **crisis**: 988 and the Counseling Center, before anything else.
- **not_sure**: the full directory and who to ask.
