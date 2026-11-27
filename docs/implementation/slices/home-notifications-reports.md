# Home, notifications and reports

Status: Verified

## Scope

Home "what needs me": texts readers see wrong in my languages, my review queue, my drafts, recently shipped. Daily email digest per person (SMTP), opt-out. Monthly report of words written and reviewed per person.

## Server part

Done on 2026-11-27.

- `home.overview({ workspaceId })` is open to every member and to keys: `needsYou` (total, `fixes` with the most seen first, `reviews` per project and language, `drafts` in progress and sent, `conflicts`), `progress` per project and language by state, `shipped`, `week`, `languages` and `nextReleaseAt` (D-058).
- The daily digest is a `DIGEST` job per person and day in the job table, run by the same clock as the releases (the `clock` Nitro plugin, with SMTP configured); `people.preferences` reads and the people-only `people.updatePreferences` changes the opt-out (D-059).
- `reports.monthly({ workspaceId, month })` is for owners and admins: words and texts written and reviewed per person and language, with totals; approvals store their words (D-060).

## Acceptance evidence

End-to-end: the digest lists the right items for a reviewer; the report counts words for the month. Screens captured.

Server part, verified on 2026-11-27 against PostgreSQL, the real server, real git repositories and an SMTP server that records the mail (`apps/web/tests/home.test.ts`, run with `GLOT_TEST_PORT=3193 bunx vp test run` in `apps/web`):

- A Polish reviewer's overview agrees with `texts.search` (the texts failing in Polish and the count per state of each language) and with `reviews.queue` (the Polish queue); the first fix is the Polish `endedOn` text with its failed placeholder check, shown in Admin and Market. An owner has every language, a writer only changes theirs and approves none, a viewer has nothing to do, someone outside the workspace gets NOT_FOUND.
- A writer's drafts show as one in progress and one sent, latest first, and the reviewer sees the sent one in the queue. After an edit-and-approve and an approval, the fix leaves the list, the week counts one text reviewed and two written, and once the release is merged it shows as shipped with who started it and its two changes. A change held back by a conflict shows for its author, for the reviewer of the language and for the owner, never for a viewer.
- The digest waits for 07:00 UTC, then sends one mail to the Polish reviewer and none to the viewer, to the person who turned it off or to the person who never signed in. The mail has a text and an HTML part, lists the failing key with its reason, the queue of the language and links into the app (`/projects/<id>/review/pl`, the text, `/settings`); a name with an accent and an ampersand arrives intact and is escaped in HTML. Ticking again the same day sends nothing, the next day sends once more. Turning the email off stops it, also for a job planned earlier that day. A refused mail is recorded as failed and not retried that day.
- The report of a month counts the words of the texts people wrote and approved, an unsent draft and a self-approval left out; an approval made in the last second of a month, and a draft started in its first second, fall in the right month. Only owners and admins read it, and the month must be a month.
- A key reads the preference and is refused changing it; the OpenAPI document lists `home`, `reports` and `/me/preferences`, and MCP lists the reading tools but not `updateMyPreferences`.
- `bun run test` in `packages/checks`: words are counted without placeholders, tags or the plural bar.

Not done: the screens, and the digest through a real mail provider (the sink is a local SMTP server).

The screens, verified on 2026-11-27 in Chrome on `bun run demo`: every screen walked as marie (owner) and anna (Polish and German reviewer) at 1440 px in light and dark and at 375 px, with no text shown without its key and no script error; `bun run check:control-heights` on every screen, desktop and phone: 0 unequal rows, 0 icon buttons that are not square. The full suite (`bun run test`) passes: 16 files, 143 tests, 2 skipped because they call the real AI providers. Home walked as both people: Needs you from `home.overview` with the texts, their keys and the person's drafts; at 375 px the panels stack. `apps/web/tests/home.test.ts` passes.

## Decisions

D-058 to D-061. The digest hour is in the open questions list.
