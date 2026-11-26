# App shell

Status: Verified

## Scope

The layout from the design proposal, built with `@glot/ui` on ui-sdk: workspace rail (Home, Glossary, Settings), project switcher (Texts, Emails and documents, Releases), signed-in person with sign-out, light and dark, 375 px. Texts screen: search, state filters with legend, virtualized list, side panel with every language, placeholders shown as chips, keys only behind Details.

## Acceptance evidence

Screens captured in light, dark and 375 px with real seeded data; no console errors.

Captured on 2026-11-26 against the seeded demo repository (`bun run db:seed` with `GLOT_GIT_ROOT`): Home, Texts list and Texts with a text open, in light and dark at 1440 px and 375 px, through a signed-in browser. No console errors on any capture.

- The rail holds the workspace, Home, Glossary, the project switcher, the project's Texts, Emails & documents and Releases, Settings, and the person menu with appearance (system, light, dark) and sign-out. Below 768 px it moves into a drawer.
- Texts lists the project's texts most seen first in a virtualized list that loads the next page as it scrolls. Search covers every language; `/` focuses it. Filters: all, needs a fix, to check, missing.
- A text opens in a side panel (full screen on a phone) with every language, its state, whether AI wrote it, and the check failures. Placeholders show as chips from `@glot/checks`' parser. The file and key show only under Details.
- Theme tokens use `light-dark()`, so `data-theme` forces light or dark and the default follows the system.
