# Personal Wiki MCP Plan Index

Date: 2026-05-20  
Status: implementation started  
Language: English  
Design source: `.agents/design/persona-wiki`

## Goal

Build a personal wiki that compounds over time. It can work as long-term memory for agents, but the wiki is the product.

Claude, Codex, Loka, and custom agents should connect through Model Context Protocol (MCP), read useful wiki context during a chat, then add notes or propose wiki updates when useful work should survive.

The core pattern comes from Karpathy's LLM Wiki: do not re-discover knowledge from raw documents on every query. Compile knowledge into a durable, interlinked artifact, then keep it current as sources, questions, and decisions accumulate.

## Plan Files

- `01_product_scope.md`: product model, current UI findings, principles, user flows.
- `02_system_architecture.md`: repo shape, runtime boundaries, service architecture.
- `03_storage_model.md`: SQLite source of truth, Qdrant index, table design.
- `04_graph_search_rag.md`: wikilinks, graph query, search, RAG pipeline.
- `05_mcp_contract.md`: MCP resources, tools, prompts, transport, write policy.
- `06_ui_integration.md`: how to turn the current design into the app.
- `07_agent_workflows.md`: memory sourcing, proposed writes, capture, maintenance.
- `09_initial_plan_complement.md`: complementary ideas from the initial plan and Karpathy inspiration.
- `10_competitive_research_and_moat.md`: existing tools research and moat strategy.
- `11_using_mcp_with_agents.md`: practical MCP setup and tool usage for agents.

## Core Development Scope

Build these as the main product path:

1. Next.js UI port from `.agents/design/persona-wiki`.
2. SQLite page model.
3. Wikilink parser and backlink derivation.
4. HTTP API for pages, search, and graph neighborhood.
5. MCP stdio server with read/write tools.
6. MCP write/add-note tools with proposal-first safety.
7. SQLite FTS5 search.

## Current Implementation Snapshot

Implemented workspace packages:

- `apps/web`: Next.js 16 and React 19 UI shell based on `.agents/design/persona-wiki`, backed by the HTTP API.
- `apps/server`: Hono HTTP API for pages, search, graph, notes, links, proposals, runtime info.
- `apps/mcp`: stdio MCP server with page resources and wiki tools.
- `packages/wiki-core`: page model, wikilinks, graph helpers, Markdown rendering, runtime paths.
- `packages/wiki-db`: SQLite schema, migrations, repository, revisions, proposals, FTS5 search.
- `packages/wiki-index`: chunking, content hashes, and embedding config. It does not call OpenAI or Qdrant yet.
- `packages/wiki-agent`: add-note proposal and page helpers.

Implemented UI behavior:

- No mock data in the app.
- Empty state handles no pages and offline server state without raw fetch errors.
- Sidebar groups and graph legend derive from stored page kinds.
- Graph control uses the design glyph icon.

Implemented commands:

```txt
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm dev:server
pnpm dev:mcp
```

Outside current scope:

- Unreviewed direct writes for untrusted agents.
- Remote MCP.
- Qdrant indexing, semantic search, and RAG.
- Complex edge types.
- Multi-user permissions.
- Full source crawlers.

## Hard Rules

- Use English in plan files.
- SQLite is the durable source of truth.
- Qdrant is a rebuildable derived index.
- Initial planned embedding model is `text-embedding-3-small`.
- Runtime data lives under `~/.personal-wiki`.
- Page kinds are data-driven and can grow by user/domain.
- Edges stay plain in the core graph.
- Graph queries stay light first: SQLite links and recursive CTEs.
- Agent-facing memory reads return Markdown by default.
- Contributor agents should not run manual DB operations or migrations unless the owner asks. Tests use in-memory databases.
- MCP supports read and write/add-note flows.
- Default write mode is proposal-only.
