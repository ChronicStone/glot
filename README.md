# Glot

Glot is where a team writes, translates, reviews and ships the words of its products: app screens, emails and documents. Git stays the record. People who write words never see branches or files; developers and agents keep working in pull requests.

It is open source and self-hostable: one Nuxt server and PostgreSQL.

## What is in the box

| Part                                                                                                                  | Package                                       |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| The Glot app and its API: RPC, REST with an [OpenAPI document](http://localhost:3100/api/v1/docs), and MCP for agents | `apps/web`                                    |
| Typed clients for the API                                                                                             | `@glot/sdk`                                   |
| The API contract                                                                                                      | `@glot/contract`                              |
| The Nuxt module that lets members edit texts in a running app                                                         | `@glot/nuxt`                                  |
| Tokens, theme and components                                                                                          | `@glot/ui`                                    |
| Database, auth, shared types                                                                                          | `@glot/database`, `@glot/auth`, `@glot/utils` |

## Run it

Requirements: bun 1.4, Docker, Node 22.18 or later.

```sh
bun install
bun run infra:up            # PostgreSQL 18 on localhost:54329
cp .env.example .env        # then set AUTH_SECRET
bun run db:migrate
bun run db:seed             # a demo workspace, project and reviewer (anna@glot.test)
bun run dev                 # http://localhost:3100
```

Sign in with `anna@glot.test`: in development the sign-in link is printed in the server output.

## Self-host

```sh
cp .env.example .env        # set AUTH_SECRET and APP_URL
docker compose --profile app up -d --build --wait
docker compose logs glot | grep "first administrator"   # open the link
```

Requirements, environment variables, upgrades and backups: [docs/self-hosting.md](docs/self-hosting.md).

## Use the API

```ts
import { createGlotRestClient } from '@glot/sdk'

const glot = createGlotRestClient({
  url: 'https://glot.example.com',
  token: process.env.GLOT_TOKEN,
})
const page = await glot.texts.search({ projectId, state: 'NEEDS_FIX', language: 'pl' })
```

Agents connect to `https://glot.example.com/mcp` with the same token. Tokens read, draft and ask for fills; only a signed-in person approves.

## Develop

```sh
bun run check      # format, lint with the ownership rules, anti-slop, types (tsrs), agent context
bun run test       # end-to-end suite: starts its own server, so stop `bun run dev` first
```

Read [AGENTS.md](AGENTS.md) and [the architecture](docs/architecture.md) before changing code.

## Licence

The server (`apps/web`) is under the [AGPL-3.0](LICENSE). The packages a host app embeds (`@glot/contract`, `@glot/sdk`, `@glot/ui`, `@glot/nuxt`, `@glot/utils`) are under the MIT licence.
