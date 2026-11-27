# Open questions

Do not answer these questions by inference. Ask the owner.

| Question                                                                                                                | Default until answered                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Review policy: ship AI texts marked "to check", or block a language until reviewed?                                     | Ship and mark (D-007).                                       |
| Approval of Glot release pull requests on GitHub: the App counts as one approval, or a developer approves each release? | Spike the ruleset first.                                     |
| Product name.                                                                                                           | Glot.                                                        |
| Which legacy apps stay alive, and until when.                                                                           | Treated as git sources without the widget.                   |
| How external translators are paid (per word, per hour, flat).                                                           | Monthly words written and reviewed per person.               |
| Should an API key be limited to one workspace or project?                                                               | A key acts for every workspace of the person who created it. |
| What does Live mean in the release steps (Approved, Being checked, Merged, Live): a deploy signal Glot cannot see?      | The server reports open and merged only.                     |
| When does the clock release: 08:00 and 14:00 UTC, or the team's local times?                                            | 08:00 and 14:00 UTC (D-038).                                 |
| Should undo remove a text that had no text before its release?                                                          | Refused: undo restores a previous text only.                 |
| When does the daily digest arrive: 07:00 UTC, or the morning of each person?                                            | 07:00 UTC (D-059).                                           |
| Should drafts written by an AI fill belong to the person who asked, or to a system author that anyone may approve?      | The person who asked (D-066).                                |

- Should self-hosters be able to restrict preview adapter hosts (an allowlist variable like `WIDGET_ORIGINS`)? Glot already refuses redirects, queries and fragments and caps the answer at 5 MB (D-075).
- Should Glot flag the source texts that leave markup open (a `<` followed by a letter, `/`, `!` or `?`)? vue-i18n's fallback can show such a source text next to a translation; translations can no longer open, close or add a script attribute to it (D-076), but a boolean attribute or a `class` can still land on it.
