# AI fills

Status: Planned (screen pending redesign)

## Scope

A provider interface with Anthropic and OpenAI adapters (keys per workspace, encrypted at rest), placeholders and HTML protected by numbered tokens and restored exactly, glossary terms in every prompt. "Suggest" on one text, "Fill missing" for a project and language as a job in batches with a monthly budget. AI text is saved as a draft marked as written by AI, never approved.

## Server part

Done on 2026-11-27. The AI settings screen and the Suggest and Fill actions wait for the redesign; this slice stays Planned until they exist.

- `ai.settings`, `ai.updateSettings`, `ai.setKey`, `ai.removeKey` and `ai.usage` are for owners and admins; the three writes are people-only and hidden from MCP. A key is never returned: only whether it is set and its last 4 characters (D-063).
- `ai.suggest` and `ai.fillMissing` are open to anyone who may change the language, keys included (an agent may ask for AI fills, never approve). `ai.fills` lists a project's runs (D-065, D-066).
- Drafts carry `aiWritten`, and a text's `aiWritten` is now real.
- The tokenizer is `protectMessage` and `restoreMessage` in `@glot/checks` (D-064); the adapters and the cost table are D-062.
- The fill run is an `AI_FILL` job picked up by its own loop of the clock (the `clock` plugin).

## Acceptance evidence

End-to-end with a recorded provider adapter: suggestions keep every placeholder; a broken token is rejected; the budget stops a batch. A real provider call when a key is configured.

Server part, verified on 2026-11-27 against PostgreSQL, the real server, real git repositories and a local HTTP sink that records every request and replays scripted answers or failures (`apps/web/tests/ai.test.ts`, run with `GLOT_TEST_PORT=3193 bunx vp test run` in `apps/web`: 126 tests pass, 2 skipped, 20 of them for this slice):

- Anthropic: the recorded request is `POST /v1/messages` with `anthropic-version: 2023-06-01`, the key in `x-api-key`, model `claude-sonnet-5-5` and only model, token limit, system and messages. OpenAI: `POST /v1/responses` with a bearer key, model `gpt-6.2-sol`, `store: false`.
- A suggestion for `Fin le {date}` comes back as `[pl] Fin le {date}` with its reason and its cost from the reported tokens; the prompt carries the key, where the text shows, the source with tokens, the approved texts of the other languages, the Polish plural categories, the glossary term of the lot and the word to avoid. A source with two plural forms says so; a link keeps its opening and closing tags.
- An answer that drops, repeats or invents a token is refused with a 422 after exactly one more call, whose prompt lists what was wrong; an answer that recovers on the second call is accepted; nothing is saved by a suggestion.
- A 401 is a 502 naming the provider's message, never the key; a 429 with `retry-after` is retried; a persistent 500 is a 502 after three calls; a refusal is reported as one.
- The key is stored as `v1.<iv>.<tag>.<data>` without the plaintext and differs at each save; a tampered value says the key cannot be read, and setting it again repairs it. A key (API key) cannot change settings or keys.
- A suggestion saved with `aiWritten` shows as such to its author and in the queue; its author cannot approve it with two reviewers of the language, the other reviewer can, and the text then reads reviewed, written by AI, not self-approved. It stays marked after the release is merged; editing the draft clears the flag.
- A fill is queued once (asking again returns the waiting run), refused without a key, without the right on the language and for outsiders. A provider failing mid-run stops it as partial with that reason and nothing written; a key removed after the request stops it with NO_KEY.
- With a 1 dollar budget and calls costing 0.80, the first 2 calls (10 of 23 texts) are paid, the run stops as partial with BUDGET_REACHED, the usage shows 2 calls and 1.6 dollars, and the drafts are 10, sent for review, written by AI, authored by the requester, with no approval. Asking again is refused until the budget is raised; then the run fills the other 13 in 3 calls and ends done. Asking again says nothing is missing and calls nothing; 23 drafts exist, one per text, with placeholders, tags and plural bars intact.
- A text whose answer breaks a token twice is left out and counted (partial with TEXTS_REJECTED); the others are written, and the retry carries only that text.
- `ai.usage` shows the month, the spend against the budget, the tokens and, per language, the texts written.
- Real provider calls (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`): two tests suggest a Polish text through the real API and run only when the variable is set; they were skipped here as no key was available.
- `bun run test` in `packages/checks`: the tokenizer round-trips placeholders, plural bars, links, literals, tags and broken sources byte for byte, and rejects missing, repeated, invented and broken tokens.

Not done: the screens, and a real provider call, not run without a key.

## Decisions

D-062 to D-066. Who owns the drafts of a fill is in the open questions list.
