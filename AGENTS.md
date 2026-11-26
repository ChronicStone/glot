# Glot agent contract

Glot is an open-source, self-hostable translation workspace: people write, review and ship the words of their apps, emails and documents, while git stays the record. Treat this repository as the authority for Glot behavior and preserve unrelated work in a dirty worktree.

## Start here

Before changing code, read the vocabulary in [CONTEXT.md](CONTEXT.md) and load [`glot-code-patterns`](.agents/skills/glot-code-patterns/SKILL.md). Backend, contract, database and auth work also loads [`glot-api-contracts`](.agents/skills/glot-api-contracts/SKILL.md). Read [the architecture](docs/architecture.md) when deciding ownership or adding a flow. Before starting or resuming a slice, read [the implementation ledger](docs/implementation/README.md) and its linked slice record.

Source and behavioral tests establish current implementation. Skills establish how to change it. ADRs explain hard-to-reverse choices. Documentation never overrides a contradictory schema or runtime contract; resolve the contradiction rather than choosing silently.

## Engineering contract

- Build deep modules with small typed interfaces. Put a seam only where behavior genuinely varies or a module hides reusable complexity.
- Every type has one source of truth. Persisted closed values live in `@glot/database` constants; tables derive from them; Zod validators derive from tables through `drizzle-orm/zod`; TypeScript types are inferred from schemas and validators. Never write a parallel DTO, enum array or hand-typed mirror.
- One role per file, with no mixed kinds: schemas in `*.schema.ts`, relations in `*.relations.ts`, constants in `*.constants.ts`, types in `*.types.ts`, validators in `*.validator.ts`, utilities in `*.utils.ts`, contracts in `*.contract.ts`, routers in `*.router.ts`, services in `*.service.ts`. Lint enforces it.
- Keep one-use logic with its owner. A helper, type, service or package must own a concrete responsibility rather than rename or forward one call.
- Use at most two authored parameters, with an inline options object instead of positional primitives.
- Use named top-level functions and arrow callbacks. Semantic constants use `UPPER_SNAKE_CASE`; configured library objects and external protocol values keep their native spelling.
- Write no code comments; names and structure carry intent. Keep utilities pure, database effects in services, and control flow local.
- Test observable behavior through real boundaries: HTTP, PostgreSQL, auth. A test that repeats an implementation or a type is not evidence.

## Backend boundaries

- Nuxt (Nitro) serves the app and the API. One oRPC router, implemented from `@glot/contract`, is served as RPC (`/rpc`), REST with its OpenAPI document (`/api/v1`) and MCP (`/mcp`). better-auth owns identity at `/api/auth`.
- Drizzle and PostgreSQL 18 own persistence through the better-drizzle client. Domain IDs are native `uuidv7()`; auth and external identifiers stay `text`.
- Git is the record for texts, reviews and the glossary ([ADR 0001](docs/adr/0001-git-is-the-record.md)); the database keeps what git cannot: people, drafts, pending approvals.
- Tokens never approve or release. Only a signed-in person does.

## Routing

- Backend, contract, persistence, auth, API, MCP and tests: [`glot-api-contracts`](.agents/skills/glot-api-contracts/SKILL.md).
- Guidance and routing changes: [`glot-skill-maintenance`](.agents/skills/glot-skill-maintenance/SKILL.md).

Run `bun run check:agent-context` after changing this contract, a skill, `CONTEXT.md`, an ADR or the architecture guide.

Update the implementation ledger in the same change as a slice. Record decisions when they are made, keep unresolved questions explicit, and mark a slice complete only when its acceptance evidence exists.

## Delivery boundaries

Do not commit, push, deploy, migrate shared systems, call external providers, or send messages unless the user explicitly authorizes that action. Report tests, builds, generated contracts and runtime acceptance as separate claims.
