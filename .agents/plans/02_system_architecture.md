# System Architecture

## Current Repo Structure

Keep boundaries clean.

```txt
apps/
  web/                 # Next.js UI from persona-wiki design
  server/              # HTTP API and local app server
  mcp/                 # MCP stdio and Streamable HTTP transports
packages/
  wiki-core/           # page model, wikilink parser, graph services
  wiki-db/             # SQLite repositories and SQL files
  wiki-index/          # chunking, embeddings, Qdrant sync
  wiki-agent/          # proposal builder and ingest helpers
.agents/
  AGENTS.md            # project notes for agents
  design/persona-wiki/ # extracted UI mock
  plans/               # planning docs
```

Keep `apps/web`, `apps/server`, and `apps/mcp` separate.

`apps/web` owns the Next.js UI. `apps/server` owns the HTTP API. `apps/mcp` owns MCP transports and tool/resource registration.

## Runtime Architecture

```txt
MCP clients
  Claude / Codex / custom agents
        |
        | stdio local transport, Streamable HTTP protected transport
        v
apps/mcp
        |
        v
packages/wiki-core
        |
        +--> packages/wiki-db --> SQLite
        |
        +--> packages/wiki-index --> Qdrant
        |
        +--> proposal service

apps/web (Next.js)
        |
        | HTTP JSON
        v
apps/server
        |
        v
same wiki-core services
```

Both MCP and HTTP API should call the same core services. Do not duplicate graph, search, or write logic.

## Suggested Stack

Use TypeScript unless there is a strong reason not to.

Suggested choices:

- React for the web UI.
- Next.js for the web app.
- App Router for UI routes and server components.
- Hono for local HTTP.
- Official MCP TypeScript SDK for the MCP server.
- SQLite with a typed repository layer.
- Qdrant client for semantic search.
- `text-embedding-3-small` as the initial embedding model.
- A small internal package for chunking and index jobs.

Keep the implementation boring. Avoid framework overlap between the web app, HTTP API, and MCP server.

## Service Boundaries

`wiki-core` owns:

- Page shape.
- Entity kinds.
- Wikilink parsing.
- Alias resolution.
- Link derivation.
- Graph traversal interfaces.
- Proposal validation.

`wiki-db` owns:

- SQLite schema files.
- Query functions.
- Transactions.
- FTS5 queries.
- Revision reads and writes.

`wiki-index` owns:

- Chunk creation.
- Content hashing.
- Embedding provider abstraction, starting with OpenAI `text-embedding-3-small`.
- Qdrant upsert/delete.
- Rebuild logic.

`wiki-agent` owns:

- Capture normalization.
- Session summary shaping.
- Proposal payload helpers.
- Maintenance review item generation.

`apps/server` owns:

- HTTP endpoints.
- Local auth if needed.
- UI data shaping.

Implemented endpoints include:

- `GET /health`
- `GET /api/runtime`
- `GET /api/pages`
- `POST /api/pages`
- `GET /api/pages/:id`
- `PATCH /api/pages/:id`
- `GET /api/search`
- `GET /api/graph`
- `POST /api/notes`
- `POST /api/links`
- `GET /api/proposals`

`apps/mcp` owns:

- MCP resource registration.
- MCP tool registration.
- MCP prompt registration.
- Client capability and transport setup.

Implemented stdio tools:

- `wiki_search`
- `wiki_get_page`
- `wiki_graph_query`
- `wiki_add_note`
- `wiki_append_page`
- `wiki_link_pages`
- `wiki_runtime`

## Data Ownership

SQLite is durable. Qdrant is derived.

Agents may run database operations and migrations only against local/dev databases. Never run them against remote, shared, staging, or production databases unless the owner explicitly says so for that target.

Runtime data should live outside tracked source under `~/.personal-wiki`:

```txt
~/.personal-wiki/
  personal-wiki.sqlite
  config.json
  resources/
  uploads/
  qdrant/
  logs/
  backups/
```

All local runtime data paths should be ignored by Git.

The repo should contain source code, tests, design references, and plans only. It should not contain private resources or mutable runtime state.
