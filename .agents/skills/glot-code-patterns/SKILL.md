---
name: glot-code-patterns
description: Reviews Glot code for ownership, one role per file, single-source types, deep modules, simplicity and meaningful tests. Use when changing, simplifying, testing, or reviewing any Glot code or abstraction.
---

# Glot code patterns

Build the smallest complete design that satisfies current behavior, security, performance, and failure handling. Preserve useful capabilities; remove machinery that does not own a decision or hide meaningful complexity.

## Apply

1. Identify the domain owner, canonical contract, and observable behavior being changed.
2. Apply the deletion test and separate configuration from execution where variants share a lifecycle.
3. Implement the behavior in its owner, deriving types and contracts instead of mirroring them.
4. Run the smallest meaningful owning check. Fix a demonstrated failure before rerunning, then run the affected integration gate once.

## Single source of truth

- Every type has exactly one owner, and everything else derives from it. Persisted closed values are UPPER_SNAKE records in `packages/database/src/constants/*.constants.ts`. Drizzle enums consume them, Zod validators derive from tables and enums through `drizzle-orm/zod`, and types are `$inferSelect`, `z.infer` or `ValueOf` of those owners.
- The API contract derives its schemas from the database validators (`pick`, `extend`) and its types from its schemas. Clients derive from the contract. Never hand-write a DTO, union, enum array or response interface that restates an owner.
- When a consumer needs a cast, `Number(...)`, a `typeof` guard or a hand annotation to use a value, fix the owner instead.

## One role per file

- A file holds one kind of declaration, named by its dotted suffix: `*.schema.ts`, `*.relations.ts`, `*.constants.ts`, `*.types.ts`, `*.validator.ts`, `*.utils.ts`, `*.contract.ts`, `*.router.ts`, `*.service.ts`, `*.config.ts`, `*.fixtures.ts`. It lives in the matching directory. Type files contain only types; utility files contain only pure functions; constants files contain only UPPER_SNAKE records.
- `glot-patterns/backend-structural-ownership` enforces placement in the backend and shared packages. Lint is the floor, not the bar: a file that passes but mixes concerns is still wrong.

Read the mandatory [ownership and file-role contract](references/ownership-and-file-roles.md) before adding a file, and [construction and reuse](references/construction-and-reuse.md) before extracting a helper, type, service or package.

## Module depth

- Prefer a deep module: a small typed interface hiding cohesive behavior, including its invariants, errors and performance expectations.
- Put a seam where behavior genuinely varies. One production implementation plus a test adapter can justify a seam for a true external service, such as the git catalog reader; one application implementation does not justify a pass-through interface.
- Apply the deletion test before adding a layer. If deleting it only exposes the same call at its caller, keep the call direct.

## Construction

- Use direct native capabilities: oRPC, better-drizzle and Drizzle, PostgreSQL, better-auth, Zod, Nuxt, ui-sdk. Extend an owned dependency when it lacks a general capability; do not create a competing protocol.
- Use at most two authored function parameters, with an inline options object instead of positional primitives. Framework-required signatures are exempt.
- Prefer inline parameter annotations and inferred return types. Introduce a named type only when it is a shared contract with a stable owner.
- Use named top-level functions and arrow callbacks. Group initialization, guards, business work and return with purposeful blank lines.
- Write no code comments; names and structure carry intent.

## Tests

- Test observable behavior through the module interface: authorization, validation, persisted state, public responses, refusal paths.
- Prefer a real local dependency when it is cheap and deterministic: PostgreSQL in Docker, the real Nuxt server, real better-auth sessions and keys. Use a test adapter only at a true remote seam.
- Reject tests that restate types, mirror the implementation, assert constants equal themselves, or break after an internal refactor with unchanged behavior.
- A regression test must go red for the reported failure before the fix.

## Routing

- Backend, contract, persistence, auth, API and MCP work: load `glot-api-contracts`.
- Guidance changes: load `glot-skill-maintenance` and keep one authoritative owner for every rule.

Verify the owning behavior and affected contracts. Existing violations are debt, never precedent.
