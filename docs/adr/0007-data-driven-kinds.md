# Kinds are data, not schema

Page kinds and entity kinds are normalized slugs stored as plain text; no enum exists in SQLite, the UI, the graph, or MCP (migration 2 removed the original page-kind CHECK constraint). Page kinds stay coarse — authored wiki pages use `note`; plan/design/article/session-note are title, tag, heading, or metadata distinctions, because they share one lifecycle. Entity kinds grow freely per user and domain.

## Consequences

- The sidebar derives its groups from stored page kinds; the graph legend derives from node kinds and subtypes. Neither shows fake empty groups.
- New domains add kinds by writing pages, never by schema change.
- A new page kind is justified only by a genuinely different lifecycle.
