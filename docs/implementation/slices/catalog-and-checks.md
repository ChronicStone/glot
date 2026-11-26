# Catalog and checks

Status: Planned

## Scope

- A project has sources: kind (`vue-i18n` catalog for now), a path pattern with `{locale}` (such as `packages/translations/i18n/locales/{locale}.json`), the source language, and the languages it holds. Stored in PostgreSQL, created with the project.
- A git reader seam with two adapters: a local repository path (development, tests, self-hosters with a mounted clone) and GitHub (REST API with a token: read the default branch head, read blobs by path). The reader returns files at one commit.
- The catalog service reads every source file of a project at the default branch head, flattens JSON into keys by path segments (`["a.b"]` and `["a","b"]` are two keys), and caches the result per commit SHA. Texts get their state: missing, needs a fix (a check failed), reviewed (an approval matches the exact source and target), to check otherwise. Released approvals are read from `.glot/reviews/<language>.jsonl` in the repository; pending ones from PostgreSQL.
- `@glot/checks`, a pure package: vue-i18n message syntax (`@intlify/message-compiler`), placeholders identical to the source, plural form count, HTML tags identical to the source, glossary words to avoid (input given by the caller). Each failure has a code and a message a writer understands.
- The demo fixture becomes a real git repository built by the seed (`tooling/seed`) with French source files and four target languages, so development and tests read through the local adapter.
- Contract: `projects.sync` (re-read the default branch now), texts carry their check failures.

## Acceptance evidence

- End-to-end: the seeded project lists texts read from its git files; changing a file and committing in the fixture repository then calling `projects.sync` shows the new text; a renamed placeholder shows as "needs a fix" with its reason; an approval stops counting when the French changes.
- `@glot/checks` unit tests on real vue-i18n syntax: named, list, plural, linked, literal, HTML.
