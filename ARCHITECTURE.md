# Architecture

## What this is

A local-first personal wiki and knowledge graph for one owner and their AI agents. Agents read compiled knowledge and propose durable notes over MCP; the owner reads, reviews, and curates through a web UI. Every accepted note compounds the graph.

## Modules

- `packages/wiki-core` — Page model, wikilink parsing and resolution, graph types and assembly helpers, Markdown rendering, runtime paths.
- `packages/wiki-db` — SQLite migrations and the repository: pages, aliases, links, entities, mentions, proposals, revisions, captures, chunks, index jobs, audit log, FTS5 search, derived graph assembly.
- `packages/wiki-index` — Chunking, content hashing, OpenAI embeddings, Qdrant sync, semantic search, RAG Markdown context.
- `packages/wiki-agent` — Proposal payload and note-input builders.
- `apps/server` — Hono HTTP API (`127.0.0.1:4321`) serving pages, search, graph, notes, links, proposals, index, and RAG endpoints.
- `apps/mcp` — stdio MCP server exposing wiki resources and the `wiki_*` tools.
- `apps/web` — Next.js reading UI (home, page view, graph, search, proposals), reaching the API via the `/wiki-api/*` proxy.
- `skills/personal-wiki` — Installable agent skill carrying the write policy; `scripts/install-skills.mjs` installs it.

## Seams

- **Repository** (`wiki-db`): the only path to SQLite. `apps/server` and `apps/mcp` are two heads over the same repository and core services; neither owns domain logic.
- **Write mode** (`propose | direct`): every agent write passes this switch; proposals are the default, direct writes require trust and record revisions.
- **Embedding provider** (`~/.personal-wiki/config.json`): model, dimensions, and endpoints are config; the semantic index rebuilds under any provider.
- **Semantic index** (`wiki-index` → Qdrant): disposable; retrieval falls back to SQLite FTS when the index is absent.
- **Graph assembly**: the heterogeneous graph is computed from SQLite tables at query time; a graph engine can be slotted in as a derived index without touching storage.

## Invariants

- SQLite is the only durable store; every other store is rebuildable from it.
- Backlinks are derived by query, never stored.
- Kinds are data: no kind enum in schema, UI, graph, or MCP.
- Graph node kinds are exactly `page`, `entity`, `agent`, `resource`; conversations are not nodes.
- Agent writes default to proposals; direct writes always create a revision and an audit entry.
- Agent-facing page reads return Markdown.
- Runtime state lives under `~/.personal-wiki`; the repo holds only source, tests, and docs.
- Secrets come from `~/.personal-wiki/config.json`, never environment variables or tracked files.
