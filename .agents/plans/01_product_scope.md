# Product Scope

## Concept

Personal Wiki is a compounding wiki and knowledge graph. It should feel close to Obsidian in structure, but rendered as a custom HTML app and exposed to agents through MCP.

Every entity is a page. Pages connect through `[[wikilinks]]` in their body. Backlinks are derived automatically. The user captures sources and chats; agents maintain the wiki.

## Inspiration

The main inspiration is Karpathy's LLM Wiki pattern.

The important move is:

```txt
raw sources
-> agent-maintained wiki
-> persistent cross-links
-> better future answers
```

This project keeps that compounding behavior, but changes the surface:

```txt
raw captures and sources
-> SQLite-backed entity pages
-> graph + Qdrant index
-> custom HTML app
-> MCP read/write memory bus
```

RAG is still useful, but it is not the product. The product is the maintained wiki artifact that gets richer with every source, chat, question, and accepted note.

## Moat Thesis

The moat is not MCP, embeddings, or a graph table. Those are commodity pieces.

The moat is the compounding wiki loop:

```txt
agent reads memory
-> agent does useful work
-> agent writes a clean note
-> note becomes a styled wiki page
-> wikilinks update backlinks
-> graph neighborhoods improve
-> future agents retrieve better context
```

Build toward these defensible parts:

- A custom reading and thinking UI, not a generic memory server.
- Durable, user-owned SQLite data with rebuildable indexes.
- Agent-written notes that are readable pages, not opaque vector memories.
- Markdown output for agent reads, so every agent gets clean context.
- Provenance for every note: source, session, agent, revision, links.
- Proposal review that keeps memory quality high.
- A personal graph that becomes harder to recreate with each accepted note.

## Current Design Source

The current UI mock lives in `.agents/design/persona-wiki`.

Important files:

- `app.jsx`: top bar, sidebar, search, navigation history, ask panel.
- `data.js`: mock topics, articles, inbox, agents, graph, and bodies.
- `views-page.jsx`: entity pages, prose rendering, wikilinks, backlinks, outgoing links.
- `views-graph.jsx`: force-directed graph with pan, zoom, focus, and click-to-open.
- `views-home.jsx`: home view.
- `styles.css`: visual system.

The mock includes sample kinds like `repo`, `lab`, `claim`, `source`, and `brainstorm`. The real product should not hardcode a fixed kind list.

## Entity Kinds

Page kinds are user and domain defined.

Examples:

- `topic`
- `note`
- `chat`
- `source`
- `person`
- `agent`
- `company`
- `project`

Rules:

- Store kinds as normalized slugs.
- Let the sidebar and graph legend derive groups from stored pages.
- Do not require schema changes for new kinds.
- Avoid fake empty groups when the database has no pages.

## Principles

1. Wiki first, RAG second.
   The wiki is the compiled knowledge layer. RAG helps find pages, but it should not replace structured pages and links.

2. SQLite is source of truth.
   Qdrant, graph layouts, embeddings, and caches are derived.

3. Writes should be reviewable.
   Agents can propose edits. Direct writes require explicit trusted-agent config.

4. Links are cheap.
   A note with a few strong wikilinks is better than a perfect unlinked summary.

5. Preserve provenance.
   Every page edit should know who made it, when, and from which source or session.

6. Local/dev first for writes.
   Use stdio MCP and localhost HTTP first. Add remote MCP only after auth and Origin validation are solid. Agents may run DB operations on local/dev databases, but remote/shared targets need explicit approval.

## Core User Flows

### Source Memory During Chat

1. User chats with Claude, Codex, or another MCP client.
2. Agent calls `wiki_search` now. Later it can call `wiki_rag_query` when semantic search exists.
3. Agent reads selected pages through `wiki://page/{id}` resources as Markdown.
4. Agent cites the wiki pages in its answer.
5. No write happens unless the user asks or the session ends with useful memory.

### Write Memory After Chat

1. Agent finishes useful work.
2. Agent calls `wiki_add_note`, `wiki_append_note`, or `wiki_propose_changes`.
3. Server writes directly only for trusted agents and safe operations.
4. Otherwise the server creates a proposal with page creates, page updates, and links.
5. UI shows the proposal in review.
6. Owner accepts, edits, or rejects.
7. Accepted changes update SQLite and enqueue indexing.

### Capture Source

1. User saves text, URL, PDF text, screenshot OCR, or chat transcript.
2. Server creates a capture item.
3. Agent extracts candidate pages and wikilinks.
4. Agent proposes 5 to 15 page updates.
5. Accepted updates become article pages and topic links.

### Query The Graph

1. User asks a graph-shaped question.
2. Server runs graph traversal over SQLite links.
3. Optional RAG expands from related pages.
4. UI returns pages, neighborhoods, backlinks, and paths.
