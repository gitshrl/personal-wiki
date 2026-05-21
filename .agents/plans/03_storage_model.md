# Storage Model

## SQLite

SQLite stores durable state.

Database file:

```txt
~/.personal-wiki/personal-wiki.sqlite
```

Keep it out of Git.

## Runtime Home

All runtime state belongs under `~/.personal-wiki`.

```txt
~/.personal-wiki/
  personal-wiki.sqlite      # SQLite source of truth
  config.json               # local app, MCP, and indexing config
  resources/                # normalized resource files and extracted text
  uploads/                  # raw user uploads before ingest
  qdrant/                   # local Qdrant storage if running embedded/container volume
  logs/                     # app and MCP audit logs if file logging is enabled
  backups/                  # local SQLite/resource backups
```

Default config:

```json
{
  "openai": {
    "apiKey": "...",
    "baseUrl": "https://api.openai.com/v1"
  },
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "qdrant": {
    "url": "http://127.0.0.1:6333",
    "collection": "personal_wiki_chunks",
    "vectorSize": 1536,
    "distance": "Cosine"
  }
}
```

The code now creates this directory through `packages/wiki-core` runtime helpers. `packages/wiki-db` uses `~/.personal-wiki/personal-wiki.sqlite` as the default database path.

The app and MCP server can create this directory at startup. Contributor agents may run database operations and migrations against local/dev databases. Never run them against remote, shared, staging, or production databases unless the owner asks for that exact target.

## Core Tables

Suggested tables:

```txt
pages
  id text primary key
  kind text not null
  title text not null
  slug text not null unique
  body text not null default ''
  summary text
  status text not null default 'active'
  source_url text
  source_type text
  trust text
  created_by_agent_id text
  created_at text not null
  updated_at text not null
  archived_at text
  metadata_json text not null default '{}'

page_aliases
  id text primary key
  page_id text not null
  alias text not null
  normalized_alias text not null unique

links
  id text primary key
  from_page_id text not null
  to_page_id text not null
  origin text not null
  source_text text
  created_by_agent_id text
  created_at text not null

captures
  id text primary key
  source_type text not null
  title text not null
  raw_text text
  source_url text
  platform text
  status text not null
  captured_by text
  captured_at text not null
  metadata_json text not null default '{}'

proposals
  id text primary key
  title text not null
  status text not null
  proposed_by_agent_id text not null
  source_capture_id text
  created_at text not null
  applied_at text
  payload_json text not null

page_revisions
  id text primary key
  page_id text not null
  body text not null
  title text not null
  changed_by text not null
  change_reason text
  created_at text not null

chunks
  id text primary key
  page_id text not null
  content_hash text not null
  chunk_index integer not null
  text text not null
  token_count integer
  qdrant_point_id text
  updated_at text not null

index_jobs
  id text primary key
  page_id text not null
  reason text not null
  status text not null
  error text
  created_at text not null
  finished_at text

agent_sessions
  id text primary key
  agent_id text not null
  client_name text
  started_at text not null
  ended_at text
  summary text

mcp_audit_log
  id text primary key
  session_id text
  tool_name text not null
  arguments_json text not null
  result_summary text
  created_at text not null

entities
  id text primary key
  kind text not null
  title text not null
  slug text not null
  summary text
  created_at text not null
  updated_at text not null
  metadata_json text not null default '{}'

entity_mentions
  id text primary key
  page_id text not null
  entity_id text not null
  source_text text not null
  created_at text not null

entity_links
  id text primary key
  from_entity_id text not null
  to_entity_id text not null
  origin text not null
  source_page_id text
  created_at text not null
```

## Notes

- `pages.kind` is a normalized, user/domain-defined slug.
- `entities.kind` is also a normalized, user/domain-defined slug.
- Do not enforce a fixed kind enum in SQLite.
- New domains can add page or entity kinds such as `trade`, `paper`, `company`, `person`, `protocol`, or `project` without migrations.
- `links.origin` starts with `wikilink`, `manual`, `proposal`, or `system`.
- The graph API is a derived heterogeneous view, not a separate source of truth.
- Graph node kinds are stable: `page`, `entity`, `agent`, and `resource`.
- There is no dedicated `chat` graph node. A conversation can become a note page if worth preserving.
- Keep stored links semantically plain. Derived graph edges can expose `links_to`, `mentions`, `represents`, `created_by`, `sourced_from`, and `co_mentioned_with`.
- `page_aliases` resolves renamed pages and `[[Title]]` variants.
- `page_revisions` supports audit and rollback.
- SQLite FTS5 should power exact and keyword search.

## Qdrant

Qdrant stores derived semantic search points.

Current implementation status:

- `packages/wiki-index` chunks pages and records embedding metadata.
- It calls OpenAI embeddings through the configured base URL.
- It creates the Qdrant collection when missing.
- It deletes stale page points before upserting new page chunks.
- It writes chunk rows and Qdrant point ids back to SQLite.
- `apps/server` exposes `/api/index/status`, `/api/index/rebuild`, and `/api/rag`.
- `apps/mcp` exposes `wiki_rebuild_index` and `wiki_rag_query`.
- If no config key is present, RAG falls back to SQLite FTS.

Initial embedding model:

```txt
text-embedding-3-small
```

Use this first because it is cheaper and good enough for personal wiki chunk search. OpenAI's embeddings docs list the default vector length as 1536 for `text-embedding-3-small` and 3072 for `text-embedding-3-large`. The same docs list an 8192 max input for both `text-embedding-3-small` and `text-embedding-3-large`.

Keep the embedding model in config. Do not bake it into table names or collection names.

Indexing needs an API key in `~/.personal-wiki/config.json`. Never store it in the repo. OpenAI, embedding, and Qdrant settings should come from that config file, not environment variables.

If Qdrant runs locally, store its persistent volume under:

```txt
~/.personal-wiki/qdrant/
```

Suggested collection:

```txt
personal_wiki_chunks
```

Suggested point payload:

```json
{
  "chunkId": "chunk-...",
  "pageId": "topic-mcp",
  "pageKind": "topic",
  "title": "MCP",
  "slug": "mcp",
  "chunkIndex": 0,
  "text": "# MCP ...",
  "updatedAt": "2026-05-20T22:00:00+07:00",
  "trust": "high",
  "sourceType": "note"
}
```

Indexing rules:

- Create chunks from page title, summary, body, and local context.
- Store chunk text in SQLite.
- Store embeddings in Qdrant.
- Store embedding model and dimensions in index metadata.
- Re-index only when content hash changes.
- Treat Qdrant as disposable. SQLite can rebuild it.

The user wrote `gdrant`. This plan assumes the intended vector database is Qdrant.
