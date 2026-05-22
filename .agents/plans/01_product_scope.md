# Product Scope

## Concept

Personal Wiki is a compounding wiki and knowledge graph. It should feel close to Obsidian in structure, but rendered as a custom HTML app and exposed to agents through MCP.

Pages are durable wiki artifacts. Entities are first-class graph nodes extracted from pages and wikilinks. Pages connect to pages, pages mention entities, and entities can connect through derived relationships. Agents maintain the wiki by writing clean pages and links, not by storing raw conversation transcripts as graph nodes.

## Inspiration

The main inspiration is Karpathy's LLM Wiki pattern.

The important move is:

```txt
raw sources
-> agent-maintained wiki
-> persistent cross-links
-> better answers
```

This project keeps that compounding behavior, but changes the surface:

```txt
raw captures and sources
-> SQLite-backed pages and entities
-> heterogeneous graph + Qdrant index
-> custom HTML app
-> MCP read/write memory bus
```

RAG is still useful, but it is not the product. The product is the maintained wiki artifact that gets richer with every source, question, and accepted note.

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
-> agents retrieve better context
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

## Kinds And Nodes

Page kinds stay coarse. Authored wiki pages use `note`; plan/design/article are title, tag, heading, or metadata distinctions. Entity kinds are user and domain defined. Graph node kinds stay small and stable: `page`, `entity`, `agent`, and `resource`. A conversation can create a note page, but there is no dedicated `chat` graph node.

Examples:

- `topic`
- `note`
- `source`
- `person`
- `agent`
- `company`
- `project`

Rules:

- Store kinds as normalized slugs.
- Let the sidebar derive groups from stored pages.
- Let the graph legend derive groups from graph node kinds and subtypes.
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
2. Agent calls `wiki_rag_query` for compiled context, or `wiki_search` for simple lookup.
3. Agent reads selected pages through `wiki://page/{id}` resources as Markdown.
4. Agent cites the wiki pages in its answer.
5. No write happens unless the user asks or the session ends with useful memory.

### Write Memory After Chat

1. Agent finishes useful work.
2. Agent calls `wiki_add_note`, `wiki_append_page`, or the proposal workflow.
3. Server writes directly only for trusted agents and safe operations.
4. Otherwise the server creates a proposal with page creates, page updates, and links.
5. UI shows the proposal in review.
6. Owner accepts, edits, or rejects.
7. Accepted changes update SQLite and enqueue indexing.

### Capture Source

1. User saves text, URL, PDF text, screenshot OCR, or a concise conversation summary.
2. Server creates a capture item.
3. Agent extracts candidate pages and wikilinks.
4. Agent proposes 5 to 15 page updates.
5. Accepted updates become note pages and topic links.

### Query The Graph

1. User asks a graph-shaped question.
2. Server runs graph traversal over the heterogeneous graph view assembled from SQLite tables.
3. Optional RAG expands from related pages.
4. UI returns pages, neighborhoods, backlinks, and paths.
