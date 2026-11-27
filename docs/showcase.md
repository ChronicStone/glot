# Showcase

A ten-minute walk through Glot on the demo: a wrong word in a live app, fixed in place, reviewed, released, and seen by every visitor. Then emails, the glossary and the settings.

## Start

```sh
bun install
bun run demo
```

It takes about a minute. The terminal prints the addresses. Every email Glot sends, sign-in links included, lands in the inbox at http://localhost:8026 (Mailpit); the terminal prints each sign-in link too.

| Who               | Role                            |
| ----------------- | ------------------------------- |
| `marie@glot.test` | Owner: every language, releases |
| `anna@glot.test`  | Reviewer of Polish and German   |

`GLOT_DEMO_OFFSET=50 bun run demo` runs a second demo beside the first (Glot on 3150, the app on 3250).

## 1. A wrong word in the app

Open http://localhost:3200/pl/lots/48213, an auction lot page in Polish. The bidding panel reads "Następna minimalna **działka**: …": a plot of land, where the French says the next minimum bid. The workspace's glossary lists "działka" among the words to avoid. A visitor sees the page and nothing of Glot.

## 2. Fix it where it is

Open http://localhost:3200/pl/lots/48213?glot and click the Glot pill. Sign in as `anna@glot.test` with the link from the inbox.

- The page's texts are outlined by state; "On this page" lists them, each with its key.
- Click the bidding panel's text. The editor opens on `marketplace.bid.nextMinimum`, with `amount` as a chip and the glossary's warning.
- Replace "działka" with "oferta" (a bid): the page changes as you type and the warning goes.
- Send for review.

## 3. Review in Glot

Sign in as `marie@glot.test` on http://localhost:3100/sign-in. Home lists what waits for her. Open Review › Polish and approve the change, or find it in Texts by its key.

## 4. Release

Open Releases and choose Release now: Glot writes the change to the `glot/release` branch, and the page reads "The release branch is waiting to merge". The demo merges that branch into main a few seconds later, as a developer merges the release pull request. Within a minute, the release moves to Shipped, with Undo.

## 5. See it live

Reload http://localhost:3200/pl/lots/48213 without `?glot`. Every visitor now reads "oferta".

## 6. Emails, documents and SMS

In Glot, open Demo apps › Emails & documents.

- Outbid, for Agorastore and for Agorastore Immo: Immo's body says "bien" (property) where Agorastore's says "lot"; the rest comes from the brand they share.
- Switch languages: a text missing in Polish shows in French, outlined.
- Click a sentence in the preview to edit it; the preview follows the keyboard, placeholders stay chips.
- The German footer's link was changed to `http:` by hand: Glot marks it Needs a fix, and a translation can never change a link.
- Outbid SMS: the curly apostrophe forces Unicode, 70 characters per message instead of 160.

## 7. And

- Glossary: concepts per language, with the words to avoid.
- Settings › AI: add a provider key to turn on Suggest and Fill missing; the month's spend shows per day against the budget.
- Settings › Workspace: who approves each language, the daily email, words per person.
- The API: http://localhost:3100/api/v1/docs, and MCP at `/mcp` for agents.
- In a repository's CI: `glot check 'locales/{locale}.json' --source-language fr --languages fr,en,de,pl,nl`.
