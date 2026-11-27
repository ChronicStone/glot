# Glot

Glot is where a team writes, translates, reviews and ships the words of its products: app screens, emails and documents. Git stays the record. People who write words never see branches or files; developers and agents keep working in pull requests.

It is open source and self-hostable: one Nuxt server and PostgreSQL.

## Try it

Requirements: bun 1.4, Docker, Node 22.18 or later.

```sh
bun install
bun run demo
```

One command starts PostgreSQL, a fresh demo workspace, Glot on http://localhost:3100, an auction site in five languages with the in-app editor on http://localhost:3200, and a preview adapter for its emails. Sign in as `marie@glot.test` (owner) or `anna@glot.test` (Polish and German reviewer): the sign-in emails land in Mailpit on http://localhost:8026, and the terminal prints each link too. [docs/showcase.md](docs/showcase.md) walks through it in ten minutes: a wrong word fixed in the page, reviewed, released and live.

## What is in the box

| Part                                                                                                                  | Package                                       |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| The Glot app and its API: RPC, REST with an [OpenAPI document](http://localhost:3100/api/v1/docs), and MCP for agents | `apps/web`                                    |
| Typed clients for the API                                                                                             | `@glot/sdk`                                   |
| The API contract                                                                                                      | `@glot/contract`                              |
| The Nuxt module that lets members edit texts in a running app                                                         | `@glot/nuxt`                                  |
| The checks on texts (placeholders, plural forms, markup, links, glossary words) and SMS length                        | `@glot/checks`                                |
| `glot check` for a repository's own CI                                                                                | `@glot/cli`                                   |
| Tokens, theme and components                                                                                          | `@glot/ui`                                    |
| Database, auth, shared types                                                                                          | `@glot/database`, `@glot/auth`, `@glot/utils` |

The packages are not on npm yet: use them from this repository.

## Run it for development

```sh
bun install
bun run infra:up            # PostgreSQL 18 on localhost:54329, Mailpit on localhost:8026
cp .env.example .env        # then set AUTH_SECRET
bun run db:migrate
bun run db:seed             # a demo workspace, project and reviewer (anna@glot.test)
bun run dev                 # http://localhost:3100
```

Sign in with `anna@glot.test`: in development the sign-in link is printed in the server output. With `SMTP_URL=smtp://127.0.0.1:1026` and a `MAIL_FROM` in `.env`, every email Glot sends also lands in Mailpit.

## Self-host

```sh
cp .env.example .env        # set AUTH_SECRET and APP_URL
docker compose --profile app up -d --build --wait
docker compose logs glot | grep "first administrator"   # open the link
```

Requirements, environment variables, upgrades and backups: [docs/self-hosting.md](docs/self-hosting.md). To preview your emails, documents and SMS in Glot, run a [preview adapter](docs/preview-adapter.md) next to your renderer.

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

In a repository's CI, `glot check` fails the build on a broken placeholder, plural form, tag or link:

```sh
glot check 'locales/{locale}.json' --source-language fr --languages fr,en,de
glot check 'emails/agorastore/{locale}.json' 'emails/_common/{locale}.json' \
  --syntax handlebars-html --source-language fr --languages fr,en,de
```

## Develop

```sh
bun run check      # format, lint with the ownership rules, anti-slop, types (tsrs), agent context
bun run test       # end-to-end suite: starts its own server, so stop `bun run dev` first
```

Read [AGENTS.md](AGENTS.md) and [the architecture](docs/architecture.md) before changing code.

## Licence

The server (`apps/web`) is under the [AGPL-3.0](LICENSE). The packages a host app or a CI embeds (`@glot/contract`, `@glot/sdk`, `@glot/ui`, `@glot/nuxt`, `@glot/checks`, `@glot/cli`, `@glot/utils`) are under the MIT licence.
