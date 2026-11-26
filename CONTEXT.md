# Glot

Glot lets people write, translate, review and ship the words of their products. This glossary fixes the language shared by the code, the API and the documentation.

## Words and where they live

**Text**:
One message in one language, such as the Polish label of a Save button.
_Avoid_: Translation string, key

**Key**:
Where a text lives: a source and its JSON path segments. `["a.b"]` and `["a", "b"]` are two keys. It is how everyone manages a text, so it is shown with every text, everywhere.
_Avoid_: Text, label

**Source**:
A set of files that holds texts: a vue-i18n catalog, a plain JSON catalog, or template texts.
_Avoid_: Catalog file, namespace

**Catalog**:
What Glot reads from a source at one revision: every key with its texts.
_Avoid_: Source, dictionary

**App**:
A product surface that shows texts from several sources in a fixed order, such as an admin app or the email build.
_Avoid_: Project, source

**Project**:
One git repository connected to a workspace, with its sources, apps and languages.
_Avoid_: App, repo

**Workspace**:
The organization that owns projects, people and the glossary.
_Avoid_: Tenant, team

## Work on texts

**Draft**:
A change to one text in one language that only its author sees until it is sent for review.
_Avoid_: Edit, suggestion

**Approval**:
A person's statement that one target text is right for one exact source text. It stops counting when either changes.
_Avoid_: Review state, validation

**Release**:
A batch of approved changes written to git as one pull request.
_Avoid_: Deploy, sync, export

**Glossary term**:
A concept with its term in each language, words to avoid and a status (suggested, validated, turned down).
_Avoid_: Lexicon entry, dictionary

## People

**Member**:
A person with a role in a workspace and the languages they change.
_Avoid_: User account, seat

**Reviewer**:
A member who approves texts in their languages.
_Avoid_: Translator, validator

**Agent**:
A program acting with an API key. It reads, drafts and asks for AI fills; it never approves or releases.
_Avoid_: Bot user, integration
