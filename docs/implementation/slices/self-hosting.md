# Self-hosting

Status: Planned

## Scope

- A production Docker image of `apps/web` (Nitro `node-server` output), a `docker-compose.yml` example with PostgreSQL 18, migrations applied on start.
- First run: when no user exists, the server prints a one-time setup link; the setup page creates the first admin, their workspace, and signs them in. The link stops working after use.
- Mail delivery for sign-in links through SMTP when configured (`SMTP_URL`, `MAIL_FROM`); development keeps printing links.
- GitHub Actions: `bun run check`, `bun run lint:rules:test`, and the end-to-end suite with a PostgreSQL 18 service, on pull requests and on `main`.
- `docs/self-hosting.md`: requirements, environment variables, first run, upgrades, backups.

## Acceptance evidence

- The image builds and serves `/api/v1/openapi.json` against a fresh database; the setup link creates the first admin end to end (tested).
- The workflow passes on GitHub.
