# 0001 Git is the record

Status: Accepted

## Context

Translation tools that keep their own copy of the texts end up with two sources of truth and a reconciliation step between them. Developers and agents already change texts in pull requests.

## Decision

Git is the record. Texts and released approvals live in the project's repository. The glossary belongs to the workspace, spans its projects and is pulled by other services, so it lives in PostgreSQL (D-042). Glot reads every merge and writes its changes as pull requests made of per-value edits. When the default branch moves, Glot re-applies its pending edits on the new head (a semantic rebase); a real conflict is the same key and language changed on both sides. People who write words never see branches, commits or conflicts.

## Consequences

- The database holds only what git cannot: people, drafts, pending approvals and the workspace glossary.
- A project works without Glot: its files are the truth.
- Releases depend on the repository host and its merge rules.
