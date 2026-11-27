# People and settings

Status: Verified

## Scope

- People: invite by email with a role and languages, expiry for externals, change role and languages, remove. Invitations accepted through the sign-in link.
- API keys: create, name, revoke, last used; a key is shown once.
- Projects: create a project (repository, default branch, connection: local path or GitHub token), edit sources and languages, sync now.
- Workspace switcher when a person belongs to several.

## Acceptance evidence

End-to-end: an admin invites a reviewer for Polish, the invitee signs in and sees only Polish as editable; a non-admin cannot invite; a revoked key is refused. Screens captured.

The screens, verified on 2026-11-27 in Chrome on `bun run demo`: every screen walked as marie (owner) and anna (Polish and German reviewer) at 1440 px in light and dark and at 375 px, with no text shown without its key and no script error; `bun run check:control-heights` on every screen, desktop and phone: 0 unequal rows, 0 icon buttons that are not square. The full suite (`bun run test`) passes: 16 files, 143 tests, 2 skipped because they call the real AI providers. Settings › People, Projects, API keys, AI and Workspace walked as marie: an invite, a key shown once, the workspace renamed and the daily email switched, both kept after a reload. `apps/web/tests/people.test.ts` passes, an API key refused for renaming the workspace included.
