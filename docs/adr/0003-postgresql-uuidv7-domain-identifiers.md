# 0003 PostgreSQL 18 uuidv7 domain identifiers

Status: Accepted

## Decision

Domain tables use native PostgreSQL `uuid` primary keys with a `uuidv7()` default. Auth tables keep better-auth's text identifiers, and opaque identifiers remain `text` (text ids from a catalog, provider ids).

## Consequences

PostgreSQL 18 is the minimum version, for development, tests and self-hosting.
