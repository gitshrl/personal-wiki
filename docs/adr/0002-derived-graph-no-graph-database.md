# The graph is derived from SQLite, not stored in a graph database

The heterogeneous knowledge graph is assembled at query time from SQLite tables (`links`, `entities`, `entity_mentions`, `entity_links`) using plain queries and recursive CTEs. We rejected Neo4j outright and hold Kuzu in reserve as a derived index only if traversal pressure appears — for a personal wiki, SQLite traversal is enough and a graph engine would add operational weight without moat.

## Consequences

- Node kinds are fixed: `page`, `entity`, `agent`, `resource`. Edge kinds are stable (`links_to`, `mentions`, `represents`, `created_by`, `sourced_from`, `co_mentioned_with`, `related_to`); stored links stay semantically plain.
- Backlinks are never stored as rows; they are queries over `links`.
- There is no `chat` node. A useful conversation becomes a note page; raw conversation state is not a graph primitive.
- Any graph engine added later must be rebuildable from the SQLite tables (see [0001](0001-sqlite-source-of-truth.md)).
