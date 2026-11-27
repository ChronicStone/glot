# In-app editing

Status: Verified

## Scope

The `@glot/nuxt` widget signs a member in through a popup on the Glot server, receives a short-lived widget token, and shows only to workspace members of the configured project. Drawer "On this page" grouped by needs a fix, to check, reviewed, with the texts' states from Glot; click a text in the page or the drawer to edit; drafts apply to the running page for their author (`mergeLocaleMessage`) and are saved to Glot.

## Acceptance evidence

Playground end to end: a member signs in from the widget, edits a Polish text, sees it on the page, finds the draft in Glot. A non-member sees no widget. Recording or screens captured.

The screens, verified on 2026-11-27 in Chrome on `bun run demo`: every screen walked as marie (owner) and anna (Polish and German reviewer) at 1440 px in light and dark and at 375 px, with no text shown without its key and no script error; `bun run check:control-heights` on every screen, desktop and phone: 0 unequal rows, 0 icon buttons that are not square. The full suite (`bun run test`) passes: 16 files, 143 tests, 2 skipped because they call the real AI providers. `docs/showcase.md` walked in Chrome on the demo app: a visitor gets no widget; anna signs the widget in through the popup, opens `marketplace.bid.nextMinimum` from the page with the glossary's warning, types "oferta" and the page follows; she sends it for review, marie approves it from Review › Polish and releases, and the visitor then reads "Następna minimalna oferta". `apps/web/tests/widget-showcase.test.ts` (3) and `widget.test.ts` pass.
