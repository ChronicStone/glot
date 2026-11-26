# Self-hosting

Status: Verified

## Scope

- A production Docker image of `apps/web` (Nitro `node-server` output), a `docker-compose.yml` example with PostgreSQL 18, migrations applied on start.
- First run: when no user exists, the server prints a one-time setup link; the setup page creates the first admin, their workspace, and signs them in. The link stops working after use.
- Mail delivery for sign-in links through SMTP when configured (`SMTP_URL`, `MAIL_FROM`); development keeps printing links.
- GitHub Actions: `bun run check`, `bun run lint:rules:test`, and the end-to-end suite with a PostgreSQL 18 service, on pull requests and on `main`.
- `docs/self-hosting.md`: requirements, environment variables, first run, upgrades, backups.

## Acceptance evidence

- Image, from a clean `git archive` of `origin/main`: `docker compose -p glot-selfhost --profile app up -d --build --wait` against a new database. `GET /api/v1/openapi.json` answered 200 and the log printed the setup link. `POST /api/auth/setup/complete` with that token returned the new user and workspace and set a session cookie that `GET /api/auth/get-session` accepted; posting the same token again returned 403 and `GET /api/auth/setup/status` answered `{"open":false}`. `git` is present in the image.
- `apps/web/tests/setup.test.ts` (part of `bun run test`): starts its own server on an empty database with an SMTP capture server, then proves the printed link, the refusal of a wrong token, the first administrator and workspace (owner) with a working session through `@glot/sdk`, the refusal of the used link, and a sign-in link delivered over SMTP and followed to a session.
- Setup page, in a browser against an empty database: form, submit, signed in to the new workspace, and the used link showing that it is not valid anymore (design trace `self-hosting`).
- GitHub Actions: `.github/workflows/ci.yml` passed on `main` at 7b90742 (run 45901807307). An earlier run on 8a7776f failed once on the first `texts.search` of `api.test.ts` with a 500 and passed on the next push without a code change.

## Decisions

D-021 to D-024.
