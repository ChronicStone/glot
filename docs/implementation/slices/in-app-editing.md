# In-app editing

Status: Planned

## Scope

The `@glot/nuxt` widget signs a member in through a popup on the Glot server, receives a short-lived widget token, and shows only to workspace members of the configured project. Drawer "On this page" grouped by needs a fix, to check, reviewed, with the texts' states from Glot; click a text in the page or the drawer to edit; drafts apply to the running page for their author (`mergeLocaleMessage`) and are saved to Glot.

## Acceptance evidence

Playground end to end: a member signs in from the widget, edits a Polish text, sees it on the page, finds the draft in Glot. A non-member sees no widget. Recording or screens captured.
