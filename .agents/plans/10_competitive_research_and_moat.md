# Competitive Research And Moat

## Research Summary

This project sits in an active category. Existing tools already cover MCP memory, Markdown knowledge bases, semantic search, and graph memory.

The product should not compete as "another MCP memory server." It should compete as an agent-maintained personal wiki that compounds.

Memory is one use case of the wiki. The main product is the wiki itself: pages, sources, backlinks, graph neighborhoods, review, and a reading/thinking UI that improves with every accepted note.

## Closest Tools

| Tool               | What It Does Well                                                                                       | Gap For This Project                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Basic Memory       | MCP read/write over Markdown notes, SQLite index, semantic graph, local/cloud option                    | Memory/wiki substrate; no custom Next.js compounding wiki UI like persona-wiki              |
| Lithos             | Local privacy-first multi-agent MCP memory, Markdown on disk, hybrid search, task coordination          | Strong agent coordination; less focused on a polished personal wiki surface                 |
| Engram             | MCP knowledge base, Markdown + YAML source of truth, FTS backends, typed relations, multiple transports | Knowledge server first; no custom page UI, proposal review, or SQLite page model            |
| Cognee             | Persistent AI memory, knowledge graph platform, MCP tools, shared/local modes                           | More platform/memory framework than personal wiki product                                   |
| OpenMemory / Mem0  | MCP memory for coding agents, auto-capture, searchable typed memories                                   | Memory layer, not a full personal wiki with pages and reading surface                       |
| Zep / Graphiti     | Temporal knowledge graph memory, local MCP server, hybrid semantic/keyword/graph retrieval              | Strong graph memory, but heavier than needed and not a personal wiki page product           |
| Khoj               | Open-source personal AI over PDFs, Markdown, plaintext, org-mode, Notion; web/desktop/Obsidian access   | Retrieval assistant over documents, not an agent-maintained compounding wiki                |
| Reor               | Local AI PKM app, Markdown editor, local models, vector DB, semantic related notes                      | Strong local PKM, but no MCP write workflow as the main agent memory interface              |
| GNO                | Local knowledge workspace, hybrid search, web UI, graph, agent integrations                             | Closest on workspace/search; still more document workspace than agent-maintained wiki pages |
| Obsidian MCP tools | Vault editing, semantic/full-text search, wikilink graph, note CRUD                                     | Tied to Obsidian/Markdown vaults; this project owns the UI and SQLite model                 |

## Category Pattern

Most existing products choose one primary identity:

- Markdown vault plus MCP.
- Agent memory service.
- Local document RAG.
- Temporal knowledge graph.
- Personal AI search app.

This project should combine the useful parts, but keep one clear identity:

```txt
agent-maintained wiki that compounds
```

## Moat Strategy

### 1. Wiki Compounding Loop

The wiki must get better every time it is used.

Each accepted note should improve at least one of these:

- A page body.
- A summary.
- A backlink.
- An outgoing link.
- A source trail.
- A graph neighborhood.
- A future retrieval result.

Memory is just one way agents access this compounding wiki.

### 2. Custom Reading Surface

The UI is the wedge.

The wiki should feel better than reading raw Markdown, Obsidian search results, or memory cards. Entity pages, backlinks, outgoing links, graph neighborhoods, source metadata, proposals, and agent notes should all feel like one product.

### 3. Agent-Written Pages, Not Opaque Memories

Agents should write notes that become normal `Article` pages.

The user should be able to read, edit, link, review, and trust them. Do not hide memory in vector chunks or opaque JSON.

### 4. Markdown For Agent Reads

Agents should read wiki pages as Markdown by default.

This makes memory portable across Claude, Codex, custom agents, and any MCP client. It also keeps the context clean:

```txt
YAML metadata
# Title
summary/body
backlinks
outgoing links
provenance
```

JSON remains available for graph queries and structured tool responses.

### 5. SQLite Source Of Truth

SQLite makes the product inspectable, local, and durable.

Qdrant and any future graph index must be rebuildable. This keeps the system from becoming an opaque memory service.

All local runtime state should live under `~/.personal-wiki`, including SQLite, resources, uploads, Qdrant storage, logs, and backups. The repository stays portable and source-only.

### 6. Quality Gate Through Proposals

Wiki quality is the hard problem.

Proposal-first writes, revisions, source/session metadata, and review UI are what prevent the graph from filling with low-value notes.

### 7. Light Graph First

Do not overbuild graph infrastructure.

Use SQLite links and recursive CTEs. Add Kuzu only as a derived index if traversal pressure appears. Keep Neo4j out of scope unless graph analytics becomes the product.

## Product Implications

Build these with extra care:

- Page rendering.
- Markdown resource output for agents.
- Proposal review.
- Provenance display.
- Backlinks and outgoing links.
- Search-to-page flow.
- Agent note style.
- Local data ownership.

Avoid spending moat energy on:

- Custom vector infrastructure.
- Complex graph engines.
- Generic chat UI.
- Obsidian compatibility as the main goal.
- Capture without review.

## References

- Basic Memory: https://docs.basicmemory.com/start-here/what-is-basic-memory
- Basic Memory technical information: https://docs.basicmemory.com/reference/technical-information
- Lithos: https://getlithos.dev/
- Engram: https://engram-kb.org/
- Cognee MCP: https://docs.cognee.ai/cognee-mcp/mcp-overview
- OpenMemory: https://mem0.ai/openmemory
- Mem0 MCP: https://docs.mem0.ai/platform/mem0-mcp
- Zep Graphiti MCP: https://www.getzep.com/product/knowledge-graph-mcp/
- Graphiti docs: https://help.getzep.com/graphiti/getting-started/welcome
- Khoj: https://docs.khoj.dev/
- Reor: https://github.com/reorproject/reor
- GNO: https://gno.sh/
