# Emails and documents

Status: Verified

## Scope

A template source kind: texts in JSON files per brand and language with override layers, placeholders declared per text and shown as chips, links and markup changes reserved to developers. A preview adapter contract (HTTP: template, brand, language, draft texts in, HTML out) with a demo adapter; the screen shows the rendered preview next to the texts, click a sentence to edit, SMS length counter.

## Server part

Done on 2026-11-27.

- A source of kind `handlebars-html` holds email, document and SMS texts. Its placeholders are `{{name}}`, `{{{name}}}` and `[[name]]`; its tags and their attributes are locked to the source text (`MARKUP`), and a link starts with `https:`, `mailto:` or a placeholder (`LINKS`) (D-068, D-069).
- Every text says its `syntax`. Checks, words to avoid, placeholder chips and AI tokens follow it, so `{{name}}` is never a vue-i18n syntax problem (D-068).
- A project names its preview adapter in `previewUrl`. Glot asks it for its brands and templates, takes each template's texts from the brand's sources in the order the adapter gives (brand, parent brand, shared texts), and sends those texts to render (D-070, D-071).
- `templates.list`, `templates.texts`, `templates.preview` (with drafts and typed overrides) and `templates.sendTest` (people only, to their own address). The adapter's contract is [preview-adapter.md](../../preview-adapter.md).
- `smsLength` in `@glot/checks` counts an SMS as GSM-7 or Unicode and names the characters that force Unicode (D-072).
- `@glot/preview-demo` is a preview adapter for the demo and the tests: Agorastore and Agorastore Immo in layers, Outbid and Lot won emails, an invoice and an outbid SMS, rendered with Handlebars.

## Acceptance evidence

End-to-end against the demo adapter: editing a sentence updates the preview; a writer changing a link is refused. Screens captured.

Server part, verified on 2026-11-27 against PostgreSQL, the real server, real git repositories and the demo adapter (`apps/web/tests/templates.test.ts`, 10 tests; the whole suite: 16 files, 138 tests pass, 2 skip without provider keys):

- The list has both brands and the four templates, each with its number of texts and its worst state.
- Immo's Outbid takes its body from `emails-immo`, its subject, greeting, ending and button from `emails-agorastore`, and its footer from `emails-common`; Agorastore's takes its body from `emails-agorastore`.
- The French preview reads « Vous avez été surenchéri sur « Renault Kangoo 2017 » » and wraps each text in `data-glot-text` with its id.
- A German draft shows in the preview at once, and a typed override replaces it.
- The seeded German footer with a changed `http:` link reads Needs a fix (`MARKUP`, `LINKS`); a writer's draft that changes the link fails `MARKUP` and cannot be sent; the same draft with the source's link is sent.
- The SMS renders as text; a test send goes to the asking person's address through the adapter; unknown templates, brands and languages are not found; a project without an adapter is a conflict; an adapter that stops answering keeps the last list (`available: false`) and fails previews with 502.
- `packages/checks/tests/templates.test.ts` (8 tests): placeholders with spaces and triple braces, a `{{` left open, markup and links, words to avoid around tags, chips, AI tokens round trip, and the mockup's SMS with a curly apostrophe at 2 Unicode messages.

The screens, verified on 2026-11-27 in Chrome on `bun run demo`: every screen walked as marie (owner) and anna (Polish and German reviewer) at 1440 px in light and dark and at 375 px, with no text shown without its key and no script error; `bun run check:control-heights` on every screen, desktop and phone: 0 unequal rows, 0 icon buttons that are not square. The full suite (`bun run test`) passes: 16 files, 143 tests, 2 skipped because they call the real AI providers. Emails & documents walked: Outbid for both brands, the languages, the SMS counter, a sentence edited from the preview. `apps/web/tests/templates.test.ts` passes, hostile adapters included (redirect, oversized and dripping answers).

## Decisions

D-068 to D-072.
