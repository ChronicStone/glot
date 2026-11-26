# Drafts and review

Status: Verified

## Scope

- Drafts: save, edit, withdraw, send for review; a draft is visible only to its author until sent.
- Review: a queue per language of texts to check and drafts sent for review, most seen first, with the reason each item is there. Approve, request a change with a comment, edit and approve. Rights: a member changes and approves only their languages; the approver is not the author when the language has two or more reviewers, otherwise the approval is marked self-approved.
- Review session screen: one text at a time, keyboard (S skip, E edit, C comment, A approve), plural forms shown with the language's numbers, glossary hits, where it shows. Phone layout.
- Batch: approve every item whose source text is already approved elsewhere with the same target.

## Acceptance evidence

End-to-end: a writer drafts and sends; a reviewer of that language approves; a reviewer of another language is refused; self-approval is marked when alone. Screens captured.

Verified on 2026-11-26 against PostgreSQL and the real server (`apps/web/tests/review.test.ts`, run with `bun run test` in `apps/web`: 42 tests pass, nine of them for this slice):

- A writer of Polish saves a draft, only the writer sees it, sends it; the Polish reviewer finds it in the queue as "sent for review", approves it, and the text reads Reviewed with that reviewer.
- A reviewer of another language, a writer and a viewer are refused for approving; a reviewer of another language and a viewer are refused for drafting; an agent key is refused for every approving procedure and MCP does not list them.
- Alone, the reviewer's own change is approved and marked self-approved. With two reviewers of a language, the author is refused and does not see their own draft in the queue; the other reviewer approves.
- A reviewer corrects a text and approves it in one step; a correction that fails a check is refused.
- A change request sends the draft back to its author with the comment and takes the text out of the queue; a draft that fails a check cannot be sent; withdrawing is for the author only.
- Texts already approved together with the same source and target are approved in one request, for the reviewers of that language only.

Screens: the Review entry beside Texts, the Texts panel editing a language, the queue of a language and the session (S skip, E edit, C comment, A approve, plural forms with the language's numbers, glossary hits, where it shows, a phone layout at 375 px) were captured against the seeded demo and driven by keyboard without console errors. They are built on Nuxt UI and are rebuilt with the redesign.

Left for later slices: the Review screens on the new design, the reviewer's name on an approved text (the API returns the person's id), and `selfApproved` for approvals already released to git (the release writes the flag).
