# Foundation

Status: Verified

## Scope

The repository shape and the end-to-end path every later slice builds on: Vite+ monorepo on bun, TypeScript 7 with tsrs, the oRPC contract served as RPC, REST with OpenAPI, and MCP from Nuxt, the database package, better-auth with magic links and API keys, the UI kit, the Texts screen, and the Nuxt module skeleton with its key log.

## Acceptance evidence

- `bun run check`: format, lint with the ownership rules, anti-slop, type checks with tsrs, agent context.
- `bun run lint:rules:test`: the ownership lint rule's own tests.
- `bun run test`: the end-to-end suite against PostgreSQL 18 and the real server, signing in by magic link and calling through `@glot/sdk` with a session and with an API key, including the refusal of approvals by keys, the OpenAPI document and the MCP tool list.

## Decisions

D-001 to D-006.
