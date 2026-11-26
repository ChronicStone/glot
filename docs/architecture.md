# Architecture

## Shape

```text
apps/web (Nuxt 4)
├─ app/                 the Glot app: texts, review, releases, glossary, people
└─ server/
   ├─ routes/           /rpc · /api/v1 (+ /openapi.json, /docs) · /mcp · /api/auth
   ├─ config/           database, auth, catalog, procedures, oRPC handlers
   ├─ domains/<domain>/ routers (contract implementation) · services (business operations)
   └─ router.ts         the one router, composed from the domain routers

packages/contract  oRPC contract: procedures, schemas derived from the database validators
packages/sdk       typed clients over RPC and REST, from the contract alone
packages/database  tables, relations, constants, validators, types, connection, migrations
packages/auth      better-auth: Google, magic links, workspaces, API keys
packages/ui        tokens, Tailwind theme, ui-sdk components
packages/nuxt      the in-app module for host apps
packages/utils     generic types
tooling/seed       development and test data
```

## Types flow one way

```text
database constants ─► tables ─► drizzle-orm/zod validators ─► contract schemas ─► oRPC router (server)
                                         │                                    └─► SDK clients, OpenAPI, MCP tools
                                         └─► inferred types ($inferSelect, z.infer, ValueOf)
```

Nothing restates a type owned upstream.

## Where data lives

| Data                                                | Owner                                                      |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Texts in every language                             | The project's repository, read through the catalog service |
| Released approvals, glossary                        | The project's repository (`.glot/`)                        |
| People, workspaces, memberships, sessions, API keys | PostgreSQL through better-auth                             |
| Drafts, pending approvals                           | PostgreSQL                                                 |

## Callers

A request carries either a better-auth session (a person) or an API key (an agent or service). Every route resolves the caller once and passes it in the request context. Services check rights; people-only procedures refuse keys and are hidden from MCP.
