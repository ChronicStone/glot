# Self-hosting

Glot is one Node server and PostgreSQL 18. The repository builds the server into a Docker image; the compose file runs it next to the database.

## Requirements

- Docker with Compose v2.
- A domain with HTTPS in front of the server for anything beyond a trial (a reverse proxy such as Caddy or nginx forwarding to the container port).
- An SMTP account if people sign in by email link.

## Start

```sh
git clone https://github.com/agorastore/glot.git && cd glot
cp .env.example .env
```

Edit `.env`:

- `AUTH_SECRET`: at least 32 random characters, for example `openssl rand -hex 32`. Changing it signs everyone out.
- `APP_URL`: the public address people open, without a trailing slash.
- `POSTGRES_PASSWORD`: a password of your own before the first start. The database keeps the one it was created with.

```sh
docker compose --profile app up -d --build --wait
```

Without `--profile app` compose starts only PostgreSQL, which is what development uses.

## First run

While no user exists, the server prints a one-time setup link at every start:

```sh
docker compose logs glot | grep "first administrator"
```

Open it, enter the workspace name, your name and your email. Glot creates the administrator as owner of that workspace and signs them in. The link works once and stops working after use; it also expires after 24 hours, and restarting the server (`docker compose restart glot`) prints a new one. Once a user exists the setup is closed.

## Environment variables

| Variable                                   | Required | Meaning                                                                                                                                                                      |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes      | PostgreSQL connection string. Compose sets it for the bundled database.                                                                                                      |
| `AUTH_SECRET`                              | yes      | At least 32 characters; signs sessions and tokens.                                                                                                                           |
| `APP_URL`                                  | yes      | Public address of the server. Sign-in links and trusted origins use it.                                                                                                      |
| `POSTGRES_PASSWORD`                        | no       | Password of the bundled database user. Default `glot`.                                                                                                                       |
| `SMTP_URL`                                 | no       | `smtp://user:password@host:587` or `smtps://user:password@host:465`. Needs `MAIL_FROM`.                                                                                      |
| `MAIL_FROM`                                | no       | Sender of sign-in emails, for example `Glot <glot@example.com>`.                                                                                                             |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no       | Enable Google sign-in.                                                                                                                                                       |
| `GLOT_GIT_ROOT`                            | no       | Folder holding clones of your repositories as `<folder>/<owner>/<name>`. With it set, texts are read from these clones with `git`. In the compose setup use `/repositories`. |
| `GITHUB_TOKEN`                             | no       | Token for reading texts from GitHub when `GLOT_GIT_ROOT` is empty. Required for private repositories; public ones work without it at a lower rate limit.                     |
| `GLOT_REPOSITORIES`                        | no       | Host folder compose mounts read-only at `/repositories`. Default `./repositories`.                                                                                           |
| `GLOT_PORT`                                | no       | Port published by compose. Default `3100`.                                                                                                                                   |

Sign-in links reach people by SMTP. Without `SMTP_URL` a production server cannot send them: invitations fail, and everyone, the setup administrator included once their session ends after 14 days, can sign in only with Google. Set SMTP or Google before inviting anyone. Google sign-in never creates an account: a person must be invited first.

## Reading your repositories

Glot reads texts from the Git repository of each project, in one of two ways:

- **GitHub** (default): leave `GLOT_GIT_ROOT` empty. Glot reads through the GitHub API; set `GITHUB_TOKEN` for private repositories.
- **Local clones**: put clones in a folder, one per repository (`repositories/acme/web` for `acme/web`), keep them up to date with `git fetch`, and set `GLOT_GIT_ROOT=/repositories` with `GLOT_REPOSITORIES` pointing at that folder. The image includes `git`.

## Upgrades

```sh
git pull
docker compose --profile app up -d --build --wait
```

The server applies the database migrations when it starts. Back up first; migrations are not reversed by going back to an older image. Run one server instance per database.

## Backups

PostgreSQL holds people, workspaces, drafts and pending approvals. Texts, released approvals and the glossary live in your Git repositories.

```sh
docker compose exec -T postgres pg_dump -U glot -Fc glot > glot-$(date +%F).dump
```

Restore into an empty database:

```sh
docker compose exec -T postgres pg_restore -U glot -d glot --clean --if-exists < glot-2026-11-26.dump
```
