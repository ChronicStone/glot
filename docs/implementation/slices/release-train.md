# Release train

Status: Planned

## Scope

- A release collects approved drafts and pending approvals of a project, writes them as per-value edits (jsonc-parser, file order and formatting kept) on the newest default branch head, appends `.glot/reviews/<language>.jsonl`, and opens or updates one pull request (`glot/release`) through the git adapter. The local adapter commits to a branch.
- Semantic rebase: before writing, each draft is checked against the current head; when its source text or its target changed since the draft was made, it becomes a conflict for its author: keep my change (rebased) or leave it out.
- Release screen: next release in steps (Approved, Being checked, Merged, Live), what needs you, shipped history with Undo (a new change restoring the previous value). Release now; automatic release twice a day (a clock in the job table).
- A `glot check` CLI built on `@glot/checks` for the repository's own CI.

## Acceptance evidence

End-to-end with the local adapter: approved drafts produce one commit on the release branch with byte-identical untouched lines; a draft whose French changed upstream becomes a conflict; Undo restores the previous text. Screens captured.
