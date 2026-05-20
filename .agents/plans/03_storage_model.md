# Storage Model

## SQLite

SQLite stores durable state.

Suggested database file:

```txt
.local/personal-wiki.sqlite
```

Keep it out of Git.

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
```

## Notes

- `links.origin` starts with `wikilink`, `manual`, `proposal`, or `system`.
- Keep links semantically plain in the core graph.
- If relation types are needed, add them after real usage proves it.
- `page_aliases` resolves renamed pages and `[[Title]]` variants.
- `page_revisions` supports audit and rollback.
- SQLite FTS5 should power exact and keyword search.

## Qdrant

Qdrant stores derived semantic search points.

Initial embedding model:

```txt
text-embedding-3-small
```

Use this first because it is cheaper and good enough for personal wiki chunk search. OpenAI docs list the default vector length as 1536 for `text-embedding-3-small` and 3072 for `text-embedding-3-large`.

Keep the embedding model in config. Do not bake it into table names.

Suggested collection:

```txt
personal_wiki_chunks
```

Suggested point payload:

```json
{
  "chunk_id": "chunk_...",
  "page_id": "page_...",
  "page_kind": "topic",
  "title": "MCP",
  "slug": "mcp",
  "chunk_index": 0,
  "updated_at": "2026-05-20T22:00:00+07:00",
  "trust": "high",
  "source_type": "note"
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
