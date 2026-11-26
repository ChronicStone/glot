# AI fills

Status: Planned

## Scope

A provider interface with Anthropic and OpenAI adapters (keys per workspace, encrypted at rest), placeholders and HTML protected by numbered tokens and restored exactly, glossary terms in every prompt. "Suggest" on one text, "Fill missing" for a project and language as a job in batches with a monthly budget. AI text is saved as a draft marked as written by AI, never approved.

## Acceptance evidence

End-to-end with a recorded provider adapter: suggestions keep every placeholder; a broken token is rejected; the budget stops a batch. A real provider call when a key is configured.
