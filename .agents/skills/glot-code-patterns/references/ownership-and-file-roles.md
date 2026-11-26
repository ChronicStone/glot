# Ownership and file roles

Placement rules govern necessary declarations. Default to local implementation, inline parameter types and inferred results. Delete unnecessary declarations before reorganizing files. Keep one role per file: never put a type beside a function, a helper beside a schema, or a constant beside a service.

## Packages

| Package          | Owns                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@glot/utils`    | Generic type and pure helpers with no domain meaning, such as `ValueOf`.                                            |
| `@glot/database` | Tables, relations, canonical constants, derived validators and inferred types, the database connection, migrations. |
| `@glot/auth`     | better-auth configuration, session and API-key resolution, the browser auth client.                                 |
| `@glot/contract` | The oRPC contract: procedures, their input and output schemas, errors and OpenAPI metadata. Browser-safe.           |
| `@glot/sdk`      | Typed clients over RPC and REST, built from the contract alone.                                                     |
| `@glot/ui`       | Tokens, the Tailwind theme and components built on ui-sdk.                                                          |
| `@glot/nuxt`     | The in-app module: widget, key log, identity exchange.                                                              |
| `apps/web`       | The Nuxt app and its server: routes, domains, configuration.                                                        |
| `tooling/seed`   | Development and test data.                                                                                          |

## Database package

Colocate schemas and native relations at `src/schemas/<domain>/` as `<domain>.schema.ts` and `<domain>.relations.ts` (a `defineRelationsPart`), with an `index.ts` exporting the schema. `src/schemas/database.relations.ts` composes every part. Canonical constants live in `src/constants/<domain>.constants.ts`, derived validators in `src/validators/<domain>.validator.ts`, inferred types in `src/types/<domain>.types.ts`, and the connection in `src/server/`. Browser-safe entrypoints (`constants`, `validators`, `types`, `schemas`) never import the connection.

Use native Drizzle declarations directly, without custom builders. Auth tables keep better-auth's shapes; mapping to Glot names (workspace, membership) stays at the better-auth adapter.

## Server

Use `apps/web/server/domains/<domain>/{routers,services,types,utils,fixtures}` and create only the roles a domain needs. `server/modules` is reserved by Nitro. Cross-domain concerns live in `server/config` (configured library objects: database, auth, catalog, procedures, handlers), `server/types` and `server/utils`. `server/routes` holds thin framework entrypoints that resolve the caller and hand the request to a handler.

Routers implement contract procedures and delegate to one service operation. Services are classes that own permissions, invariants, IO and transactions; they throw `ORPCError` with a code the contract declares. Utilities are pure and reusable.

## Names and constants

Use kebab-case subjects with dotted role suffixes, such as `texts.service.ts`, `projects.relations.ts` and `drafts.validator.ts`. Required framework entrypoints keep native names (`nuxt.config.ts`, `env.ts`, `router.ts`, route files).

Use uppercase semantic constants and uppercase business key records. Library objects stay camelCase. External protocols keep their spelling, such as better-auth's lowercase roles and invitation statuses.
