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

Every entity is a page.

Use five entity kinds:

- `Topic`: concept pages, such as `Markets`, `Portfolio`, `MCP`, or `Books`.
- `Article`: source material, notes, decisions, filings, chats, papers, gists, or tweets.
- `Person`: authors or people, such as `Karpathy`, `Buffett`, or `Kahneman`.
- `Agent`: creators of notes, such as `Claude`, `Codex`, or `Loka`.
- `Org`: organizations, such as `OpenAI`, `Anthropic`, `Berkshire`, or `BCA`.

Avoid adding new entity kinds until real usage proves they are needed.

## Graph Rules

Pages connect through `[[wikilinks]]` inside page bodies.

Backlinks are derived automatically. Outgoing links come from wikilinks and optional explicit links.

Keep edges plain for the core graph:

- No edge type.
- No edge confidence.
- No separate backlink records.

The graph should compound as agents add better links over time.

## Storage Direction

SQLite is the durable source of truth.

Qdrant is a derived semantic index for RAG. It should be rebuildable from SQLite.

Do not commit local databases, Qdrant snapshots, secrets, raw credentials, or private captures.

Agents may run database operations and migrations only against local/dev databases. Never run them against remote, shared, staging, or production databases unless the owner explicitly says so for that target.

## MCP Direction

Expose the wiki through MCP using:

- Resources for pages, backlinks, graph neighborhoods, proposals, and recent notes.
- Tools for search, graph query, RAG query, capture, add note, append page, link pages, and proposed or trusted writes.
- Prompts for memory sourcing, session summaries, source ingestion, and graph audits.

Start with local stdio MCP. Add Streamable HTTP only after auth and Origin validation are in place.

MCP is not read-only. It is the agent memory bus for both sourcing memory and adding memory.

Agent-facing page and note reads should return Markdown by default. Use JSON for search results, graph queries, proposals, and machine-oriented metadata.

Default write mode should still be proposal-only. Direct writes require explicit trusted-agent config.

## UI Direction

Use `.agents/design/persona-wiki` as the source design.

Build the real UI with Next.js.

Important UI surfaces:

- Home with recent articles and active topics.
- Sidebar with pinned pages and grouped entities.
- Entity page with title, metadata, body, backlinks, and outgoing links.
- Graph view with pan, zoom, node focus, and click-to-open.
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

Keep future plans specific, dated, and tied to implementation phases.
