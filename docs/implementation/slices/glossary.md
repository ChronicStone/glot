# Glossary

Status: Planned

## Scope

One glossary per workspace in PostgreSQL: concepts with definition, status (suggested, validated, turned down), term and plural per language, words to avoid, never-translate, notes. Editor screen; texts that do not follow a validated term show as "needs a fix" through `@glot/checks`; `glossary.list` stays the pull API for other services.

## Acceptance evidence

End-to-end: adding an avoided word marks the texts using it; turning a term down removes the warning; the pull API returns validated terms. Screen captured.
