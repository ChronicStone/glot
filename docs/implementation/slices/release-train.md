# Release train

Status: Planned (screen pending redesign)

## Scope

- A release collects approved drafts and pending approvals of a project, writes them as per-value edits (jsonc-parser, file order and formatting kept) on the newest default branch head, appends `.glot/reviews/<language>.jsonl`, and opens or updates one pull request (`glot/release`) through the git adapter. The local adapter commits to a branch.
- Semantic rebase: before writing, each draft is checked against the current head; when its source text or its target changed since the draft was made, it becomes a conflict for its author: keep my change (rebased) or leave it out.
- Release screen: next release in steps (Approved, Being checked, Merged, Live), what needs you, shipped history with Undo (a new change restoring the previous value). Release now; automatic release twice a day (a clock in the job table).
- A `glot check` CLI built on `@glot/checks` for the repository's own CI.

## Server part

Done on 2026-11-27. The screen waits for the redesign; this slice stays Planned until it exists.

- `releases.next`, `releases.history`, `releases.changes`, `releases.conflicts` are open to every member; `releases.run`, `releases.undo`, `releases.resolveConflict` are people-only and hidden from MCP. Owners, admins and developers release and undo; the author or whoever approves the language resolves a conflict.
- A run rebuilds `glot/release` from the newest default head: one commit, one pull request, nothing new when the plan is unchanged. The local adapter writes with git plumbing and leaves the clone's working tree alone; the GitHub adapter uses trees, commits, refs and pulls.
- The clock (`ReleaseJobsService`, started by the `release-clock` Nitro plugin, on in production and with `GLOT_CLOCK=on`) releases at 08:00 and 14:00 UTC from a job table with one row per project and slot.
- `glot check` is the bin of `@glot/cli` (`packages/cli`).

## Acceptance evidence

End-to-end with the local adapter: approved drafts produce one commit on the release branch with byte-identical untouched lines; a draft whose French changed upstream becomes a conflict; Undo restores the previous text. Screens captured.

Server part, verified on 2026-11-27 against PostgreSQL, the real server and real git repositories (`apps/web/tests/releases.test.ts`, run with `GLOT_TEST_PORT=3196 bunx vp test run` in `apps/web`: 53 tests pass, ten of them for this slice):

- Two approved changes and three approvals make one commit on `glot/release` whose parent is the default head. `git diff --numstat` shows two lines replaced in `pl.json` and three added to `.glot/reviews/pl.jsonl`, `pl.json` equals the seeded file with only those two values replaced, the working tree is clean and `main` has not moved. Running again changes nothing.
- After a fast-forward merge the release leaves the open state, shows in the history with who wrote what, and its texts read reviewed, a self-approved one included.
- Undo restores the text on the next release: once merged, `pl.json` equals the seeded file with only the other change. A second undo, an undo by a writer and an undo of an open release are refused.
- A draft whose French changed upstream becomes a conflict (the text reads missing meanwhile); a viewer cannot resolve it, its author keeps it, it goes back to review, is approved again and is released with the new source hash. A draft whose text changed upstream is left out by its author.
- A file with a byte order mark, CRLF, tabs and odd spacing gets its values replaced and a missing one added in its own style.
- A key of a developer is refused for release, undo and conflict resolution; the OpenAPI document lists the paths and MCP lists the reading tools only.
- The GitHub adapter replays the creation and the update of the branch and the pull request (hand-written responses in GitHub's documented shapes, not recorded live).
- The clock, with its own database and repository, releases the 08:00 slot once, runs the 14:00 slot as a no-op, and a repeated tick changes nothing.
- `bun run test` in `packages/cli`: five tests through the real binary. `bun run check` passes.

Not done: the screen, and the GitHub adapter against GitHub itself.

## Decisions

D-034 to D-040. Open questions on Live, the clock hours and undoing a first text are in the open questions list.
