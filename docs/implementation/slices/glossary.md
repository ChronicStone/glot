# Glossary

Status: Planned (screen pending redesign)

## Scope

One glossary per workspace in PostgreSQL: concepts with definition, status (suggested, validated, turned down), term and plural per language, words to avoid, never-translate, notes. Editor screen; texts that do not follow a validated term show as "needs a fix" through `@glot/checks`; `glossary.list` stays the pull API for other services.

## Server part

Done on 2026-11-27. The editor screen waits for the redesign; this slice stays Planned until it exists.

- `glossary_concept` and `glossary_concept_term` hold the glossary of a workspace (migration `glossary`). The demo seed creates `lot`, `bid` and `Agorastore` (validated, the last never translated) and `reserve price` (suggested); the demo glossary fixture is gone.
- `glossary.list` is the pull API by project: the validated concepts of the project's workspace, key-readable over REST and MCP. `glossary.listConcepts` lists every status of a workspace for the editor. `glossary.createConcept` suggests a concept (agents too); `updateConcept`, `setConceptStatus` and `removeConcept` are people-only and hidden from MCP.
- Owners and admins change every language; reviewers change the terms of the languages they review (D-045).
- Validated concepts check texts: a word to avoid in a text of its language, or a never-translated word of the source missing from the target, makes the text read "needs a fix" in the text list, in drafts (a draft that fails cannot be sent), in the review queue and in releases. The checks live in `@glot/checks` (`checkWords`, `NEVER_TRANSLATE`).

## Acceptance evidence

End-to-end: adding an avoided word marks the texts using it; turning a term down removes the warning; the pull API returns validated terms. Screen captured.

Server part, verified on 2026-11-27 against PostgreSQL and the real server (`apps/web/tests/glossary.test.ts`, run with `GLOT_TEST_PORT=3196 bunx vp test run` in `apps/web`: 64 tests pass, eleven of them for this slice; `bun run test` in `packages/checks`: 13 tests pass):

- A suggested `lot` concept checks nothing; validating it makes the German text with "Grundstück" read "needs a fix" with an `AVOID_WORDS` failure, while the Dutch text of the same source stays to check.
- Adding an avoided word to a validated concept marks the German text that uses it and no Polish one; turning the concept down removes the warning and validating it again brings it back.
- A Polish draft with an avoided word fails its check and cannot be sent; the corrected draft passes.
- A validated never-translated "Agorastore" marks the German text that dropped it and not the Polish one that kept it; turning it down clears it.
- An owner edits every language; a Polish reviewer suggests, changes and validates a Polish-only concept and changes the Polish term of a Polish and German concept, but is refused a German term, a new definition and the validation of that concept; a writer cannot suggest, a viewer reads, a stranger gets not found; names are unique whatever their case.
- The pull API returns the validated concepts only, with `language` keeping the concepts that have a term in it and the never-translated ones, through a key on the seeded demo glossary.
- A key suggests a concept and is refused validation and removal (`PEOPLE_ONLY`, 403 over REST); the OpenAPI document lists the paths and MCP lists the reading and suggesting tools, not the deciding ones.

Not done: the editor screen, the export of the glossary to git (open question), the import of the 33 `content_lexicon` rows of the CMS.

## Decisions

[D-042](../decision-log.md) the glossary in PostgreSQL, [D-043](../decision-log.md) only validated concepts check, [D-044](../decision-log.md) never-translate, [D-045](../decision-log.md) who edits, [D-046](../decision-log.md) agents suggest, [D-047](../decision-log.md) the pull API and the editor read.
