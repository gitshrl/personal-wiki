# Graph, Search, And RAG

## Wikilink Syntax

Support these forms:

```txt
[[MCP]]
[[Model Context Protocol|MCP]]
```

Resolution order:

1. Exact normalized title.
2. Exact normalized alias.
3. Slug match.
4. Missing link marker.

When a title changes:

- Keep the old title as an alias.
- Do not rewrite every old page immediately.
- New renders should point to the resolved page.

## Link Derivation

On every page save:

1. Parse body.
2. Resolve wikilinks.
3. Replace old `origin = wikilink` links for that page.
4. Insert new `origin = wikilink` links.
5. Keep manual links untouched.
6. Enqueue index job.

Backlinks are not stored as separate rows. They are queries over `links`.

## Graph Query

Core graph queries:

- `page_neighborhood(page_id, depth, kinds, limit)`
- `backlinks(page_id)`
- `outgoing(page_id)`
- `find_paths(from_page_id, to_page_id, max_depth)`
- `orphans(kind)`
- `missing_links()`
- `duplicate_candidates()`
- `recently_connected(limit)`

Use SQLite recursive CTEs for traversal. A graph database is not needed for the core product.

Light graph strategy:

```txt
core: SQLite links + recursive CTEs
optional derived index: Kuzu, only if traversal pressure appears
out of scope: Neo4j, unless graph analytics becomes the product
```

SQLite stays the source of truth even if a graph engine is added. Any graph engine should be rebuildable from `pages` and `links`.

## Search Layers

Use three layers:

1. Title and alias search from SQLite.
2. Keyword search from SQLite FTS5.
3. Semantic search from Qdrant.

This gives useful behavior before full RAG is tuned.

Use `text-embedding-3-small` for the first semantic index. Keep the provider configurable so the index can be rebuilt with another model.

## RAG Pipeline

For `wiki_rag_query`:

1. Normalize the user query.
2. Search titles and aliases.
3. Run FTS5 keyword search.
4. Run Qdrant vector search.
5. Merge candidates.
6. Expand one graph hop from top pages.
7. Rank by semantic score, FTS score, page kind, trust, recency, pinned status, and graph distance.
8. Return compact snippets and page IDs.
9. Let the agent read full resources only when needed.

Do not dump full pages into every answer. The MCP client should get small results first, then read selected pages.

## Hybrid Search

Qdrant supports hybrid and multi-stage queries with dense and sparse representations. Use that after basic dense search works.

Suggested phases:

1. SQLite FTS5 only.
2. Qdrant dense vectors with `text-embedding-3-small`.
3. Qdrant dense plus sparse hybrid.
4. Optional reranker.
5. Optional graph-aware ranking.

## Ranking Signals

Use these signals once enough data exists:

- Exact title match.
- Alias match.
- FTS rank.
- Vector score.
- Page kind.
- Trust.
- Recency.
- Pinned status.
- Number of backlinks.
- Distance from graph seed pages.
- Whether the page was cited by prior accepted proposals.
