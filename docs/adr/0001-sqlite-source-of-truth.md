# SQLite is the durable source of truth

All durable state — pages, links, entities, proposals, revisions, chunks, audit log — lives in one SQLite file (`~/.personal-wiki/personal-wiki.sqlite`). Qdrant, embeddings, and any graph index are derived and must be rebuildable from SQLite alone. This keeps the product local, inspectable, and user-owned instead of an opaque memory service; losing every derived store loses nothing.

## Consequences

- `wiki_rebuild_index` can always reconstruct the semantic index from scratch.
- The embedding model (`text-embedding-3-small` by default) lives in config, not in table or collection names, so the index can be rebuilt with another model.
- Treating Qdrant as source of truth anywhere is a bug.
