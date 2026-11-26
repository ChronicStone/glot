# Backend baseline

- One process serves the app and the API: Nuxt 4 with Nitro. Deployable as a Node server (Docker) or on serverless presets.
- One oRPC router, three surfaces: `/rpc` for Glot's own clients, `/api/v1` REST with `/api/v1/openapi.json` and `/api/v1/docs`, and `/mcp` (stateless streamable HTTP) for agents.
- PostgreSQL 18 through Drizzle 1.0 with the better-drizzle client and its timestamps plugin.
- better-auth with its Drizzle adapter, the organization, magic-link and API-key plugins.
- Texts, approvals released to git, and the glossary are read from the project's repository through the catalog service; the database keeps people, drafts and pending approvals.
- Background work (releases, AI fills, repository reconciliation) will run as jobs in a PostgreSQL table, sliced to fit serverless limits.
