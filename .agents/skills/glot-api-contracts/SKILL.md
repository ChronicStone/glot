---
name: glot-api-contracts
description: Reviews Glot backend changes across the oRPC contract, Nitro routes, domain services, better-drizzle and PostgreSQL, better-auth, OpenAPI, MCP and backend tests. Use for API, persistence, auth or server test changes. Do not use for styling-only or copy-only work.
---

# Glot API contracts

Load `glot-code-patterns`, its [ownership contract](../glot-code-patterns/references/ownership-and-file-roles.md), and the [backend baseline](references/backend-baseline.md).

## Apply

1. Identify the domain owner, the caller (person or key), the workspace scope and the public contract.
2. Change the contract first, deriving schemas from `@glot/database` validators; then implement it with `implement(contract)` in the domain router.
3. Keep routes and routers thin; the domain service performs authorization, IO and the business outcome.
4. Verify against the real server and PostgreSQL. Regenerate migrations after schema changes.

## Request flow

```text
Nitro route → resolve caller (better-auth session or API key) → oRPC handler (RPC, REST or MCP)
  → domain router (contract implementation) → domain service → better-drizzle / catalog
```

- Routes resolve the caller once with `resolveAuthenticatedActor` and build the request context; they contain no business logic.
- Routers call one service operation per procedure and return its result; the contract's output schema validates and strips the response.
- Services own permissions and throw `ORPCError` with a code the contract declares (`NOT_FOUND`, `PEOPLE_ONLY`). Tokens never approve or release: the people-only procedures are listed once in `PEOPLE_ONLY_PROCEDURES`, refused by the service for keys and hidden from MCP.
- Every query is scoped by workspace membership of the caller.

## Contract

- `packages/contract/src/contracts/<domain>.contract.ts` declares procedures with `oc`, `openapi()` metadata (method, path, operationId, summary, description, tags) and declared errors. `contracts/index.ts` composes them.
- Schemas live in `validators/*.validator.ts` and derive from the database validators with `pick` and `extend`; types in `types/*.types.ts` are `z.infer` of those schemas.
- `operationId` and descriptions are the MCP tool names and descriptions: write them for a model choosing a tool.

## Persistence

- `packages/database` owns tables, `defineRelationsPart` relations, canonical constants and derived validators. Domain tables use `uuid().primaryKey().default(sql\`uuidv7()\`)`; auth and external identifiers stay `text`.
- Services use the better-drizzle delegates (`db.<table>.findMany`, `create`, `exists`, relation filters with `is` and `some`). Keep a raw Drizzle query only where the delegate cannot express it.
- Use a native transaction for a multi-write invariant and pass it through the owning operation.
- After a schema change run `bun run db:generate` and commit the migration.

## Auth

- `@glot/auth` owns better-auth: Google sign-in when configured, magic links for invited people, workspaces through the organization plugin mapped onto Glot's tables, API keys for agents and services.
- Never decrypt, print or commit a secret. Environment values are read once in `server/env.ts`.

## Verification

Use the end-to-end suite in `apps/web/tests`: it creates a fresh database, runs migrations, seeds through `@glot/seed`, starts the real server and calls it through `@glot/sdk`, a real magic-link session and a real API key. Prove authorization, refusals, persisted state, the OpenAPI document and the MCP tool list as applicable. Record the exact checks run.
