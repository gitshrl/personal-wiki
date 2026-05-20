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

Current implementation:

- `wiki_search` uses SQLite FTS5 when a query exists.
- Empty search returns recent pages from SQLite.
- Page reads return Markdown by default through MCP.
- Graph reads use SQLite links and recursive traversal.
- `wiki_rebuild_index` chunks pages, calls OpenAI embeddings, and upserts Qdrant points.
- `wiki_rag_query` returns agent-readable Markdown context.
- `/api/index/rebuild` and `/api/rag` expose the same flow over HTTP.
- If semantic indexing is unavailable, RAG falls back to SQLite FTS.

Current search stack:

1. Title and alias search from SQLite.
2. Keyword search from SQLite FTS5.
3. Semantic search from Qdrant.

This gives useful behavior before full RAG is tuned.

Use `text-embedding-3-small` for the first semantic index. Keep the provider configurable so the index can be rebuilt with another model. OpenAI's embeddings docs list `text-embedding-3-small` as 1536 dimensions by default and `text-embedding-3-large` as 3072 dimensions by default.

OpenAI, embedding, and Qdrant settings live in `~/.personal-wiki/config.json`. Do not store the API key in tracked source. Do not use environment variables for these settings.

## RAG Pipeline

`wiki_rag_query` is implemented in the MCP server. It returns Markdown by default so agents can read the wiki as context.

Current `wiki_rag_query` flow:

1. Normalize the user query.
2. Embed the query with `text-embedding-3-small` when configured.
3. Run Qdrant vector search against `personal_wiki_chunks`.
4. Resolve Qdrant payloads back to SQLite pages and chunks.
5. Expand related page IDs from SQLite links.
6. Render Markdown context with matched snippets, page frontmatter, body, backlinks, and outgoing links.
7. Fall back to SQLite FTS when semantic search cannot run.

The current implementation returns full selected page Markdown because the agent-facing read path should be useful immediately. Tune this later if context gets too large.

## Hybrid Search

Qdrant supports hybrid and multi-stage queries with dense and sparse representations. Use that after basic dense search works.

Suggested phases:

1. SQLite FTS5 only. Done.
2. Qdrant dense vectors with `text-embedding-3-small`. Done.
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
