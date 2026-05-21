# Personal Wiki Agent Guide

## Product Concept

This project is a personal wiki and knowledge graph that compounds over time. It can also act as long-term memory for agents, but memory is not the main product.

The project is inspired by Karpathy's LLM Wiki pattern: compile knowledge once into a persistent, interlinked artifact instead of re-discovering the same facts through RAG on every question.

The UI exists first in `.agents/design/persona-wiki`. The real system should let Claude, Codex, Loka, and custom agents connect through Model Context Protocol (MCP), read useful wiki memory during a chat, and write or propose new wiki updates when useful work should survive.

The moat is the compounding wiki plus custom reading surface, not MCP, memory, or embeddings by themselves.

Official MCP docs: https://modelcontextprotocol.io/
Karpathy LLM Wiki: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
Initial complement plan: https://gist.github.com/gitshrl/31efda23ceef34802b79614b09db041e

## Core Model

Pages are durable wiki artifacts. Entities are separate graph nodes derived from typed wikilinks, explicit page metadata, and page content. A page can represent an entity, but entities do not have to be pages.

Page kinds and entity kinds are user and domain defined.

Examples:

- `topic`
- `note`
- `source`
- `person`
- `agent`
- `company`
- `project`

Do not hardcode entity groups in UI, graph, MCP, or storage. The sidebar should grow from stored page kinds. The graph legend should grow from graph node kinds and subtypes.

## Graph Rules

Pages connect through `[[wikilinks]]` inside page bodies. Typed wikilinks such as `[[person:Ada Lovelace]]` create entity mentions.

Backlinks are derived automatically. Outgoing links come from wikilinks and optional explicit links. Backlinks are not stored as separate rows.

Keep stored page links plain. The derived heterogeneous graph exposes stable edge kinds:

- `links_to`
- `mentions`
- `represents`
- `created_by`
- `sourced_from`
- `co_mentioned_with`

The graph should compound as agents add better links over time.

## Storage Direction

SQLite is the durable source of truth.

Qdrant is a derived semantic index for RAG. It should be rebuildable from SQLite.

All runtime data lives under `~/.personal-wiki`.

Use this layout:

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

Store OpenAI, embedding, and Qdrant settings in `~/.personal-wiki/config.json`.

Current config shape:

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

Do not rely on environment variables for OpenAI, embedding, or Qdrant settings.

Do not commit local databases, Qdrant snapshots, resources, uploads, logs, secrets, raw credentials, or private captures.

Agents may run database operations and migrations against local/dev databases. Tests may use in-memory databases. Never run database operations against remote, shared, staging, or production databases unless the owner explicitly says so for that target.

## MCP Direction

Current MCP resources:

- `wiki://recent`
- `wiki://page/{id}`

Expose the wiki through MCP using:

- Current tools for search, page reads, graph query, RAG query, add note, delete note, append page, link pages, runtime info, and index rebuild.
- Remaining this-phase resources for backlinks, graph neighborhoods, proposals, captures, and agent notes.
- Remaining this-phase prompts for memory sourcing, session summaries, source ingestion, and graph audits.

Start with stdio MCP. Add Streamable HTTP only after auth and Origin validation are in place.

MCP is not read-only. It is the agent memory bus for both sourcing memory and adding memory.

Agent-facing page and note reads should return Markdown by default. Use JSON for search results, graph queries, proposals, and machine-oriented metadata.

Default write mode should still be proposal-only. Direct writes require explicit trusted-agent config.

## UI Direction

Use `.agents/design/persona-wiki` as the source design.

Build the real UI with Next.js.

Important UI surfaces:

- Home with recent pages.
- Sidebar with recent pages and data-driven groups.
- Page view with title, metadata, body, related pages, and an icon-only graph neighborhood action.
- Graph view with Cytoscape.js pan, zoom, draggable nodes, node focus, and click-to-open.
- Search or ask box for direct navigation and memory queries.
- Proposal review and capture inbox for agent-written memory.

## Planning Rules

Use English in plan files.

Store plans under `.agents/plans`.

Current master plan:

`.agents/plans/00_index.md`

Complement plan:

`.agents/plans/09_initial_plan_complement.md`

Competitive research and moat plan:

`.agents/plans/10_competitive_research_and_moat.md`

Keep new plans specific, dated, and tied to this-phase implementation work.

## Current Implementation

Workspace commands:

```txt
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm dev:server
pnpm dev:mcp
```

Implemented packages:

- `apps/web`: Next.js 16 UI shell from the persona-wiki design, using Cytoscape.js for the graph.
- `apps/server`: Hono HTTP API for pages, search, graph, notes, links, proposals, runtime info, index rebuild, and RAG.
- `apps/mcp`: stdio MCP server with read, write, graph, RAG, and index rebuild tools.
- `packages/wiki-core`: page model, wikilinks, graph helpers, Markdown rendering, runtime paths.
- `packages/wiki-db`: SQLite migrations, repositories, FTS5, chunks, index jobs, revisions, proposals.
- `packages/wiki-index`: chunking, OpenAI embeddings, Qdrant sync, semantic search, and RAG Markdown context.
- `packages/wiki-agent`: add-note proposal and direct note helpers.

Implemented MCP tools:

- `wiki_search`
- `wiki_get_page`
- `wiki_graph_query`
- `wiki_rag_query`
- `wiki_rebuild_index`
- `wiki_add_note`
- `wiki_delete_note`
- `wiki_append_page`
- `wiki_link_pages`
- `wiki_runtime`
