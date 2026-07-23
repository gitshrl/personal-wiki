# Personal Wiki

An agent-maintained personal wiki and knowledge graph that compounds over time. Agents connect through MCP to read compiled knowledge and propose durable notes; memory is a use case of the wiki, not the product.

## Language

### Pages and links

**Page**:
A durable wiki artifact with a Markdown body, identified by slug.
_Avoid_: article, document

**Kind**:
The coarse lifecycle category of a page or entity, stored as a plain slug. Authored pages use kind `note`.
_Avoid_: type, category

**Note**:
An authored page of kind `note`; plans, designs, articles, and session summaries are all notes distinguished by title, tags, or metadata.

**Wikilink**:
A `[[Target]]` or `[[Target|label]]` reference authored in a page body; the only source of visible links.

**Typed wikilink**:
A wikilink with an entity kind prefix, `[[person:Ada Lovelace]]`, that records an entity mention.

**Alias**:
An alternate title that resolves to a page; a rename keeps the old title as an alias.

**Link**:
A stored page-to-page edge with an origin (`wikilink`, `manual`, `proposal`, `system`).

**Backlink**:
An incoming link, always derived by query, never stored.

### Graph

**Entity**:
A domain object in the graph (person, project, protocol, company), derived from typed wikilinks and page metadata. An entity does not require a page.

**Mention**:
A page-to-entity edge created by a typed wikilink in that page.

**Represents**:
The edge from a page to the entity it is the canonical page for, established via `entityKind` on the write.

**Graph node**:
One of exactly four kinds: `page`, `entity`, `agent`, `resource`.

**Agent**:
An identified MCP client that reads the wiki and writes through proposals; appears in the graph as a provenance node.

**Resource**:
Source material — a URL, file, or upload — that pages are sourced from.

**Neighborhood**:
The subgraph within a given depth of a focus node.

### Writing and review

**Proposal**:
An agent-submitted write held for owner review; the default result of every agent write.
_Avoid_: draft, pending change

**Direct write**:
A write that mutates pages immediately; reserved for user-approved or explicitly trusted flows, and always recorded as a revision.

**Capture**:
Raw staged input (text, URL, conversation takeaway) awaiting extraction into pages.

**Revision**:
A stored snapshot of a page's title and body for audit and rollback.

**Suggested entity**:
An agent's recorded recommendation to create, link, or skip an entity, awaiting owner approval.

### Retrieval

**Chunk**:
A hashed piece of page text embedded for semantic search; stored in SQLite, mirrored as a Qdrant point.

**Semantic index**:
The Qdrant collection of chunk embeddings; disposable and rebuildable from SQLite.

**RAG query**:
A retrieval that embeds the question, searches the semantic index, expands via links, and renders Markdown context; falls back to FTS when no index exists.

## Relationships

- A **Page** links to **Pages** through **Wikilinks**; **Backlinks** are the derived reverse view
- A **Page** mentions **Entities**; a **Page** can represent exactly one **Entity**
- **Entities** connect through co-mention when mentioned by the same **Page**
- An **Agent** submits **Proposals**; an accepted **Proposal** creates or updates **Pages**
- A **Capture** can become a **Proposal**
- A **Page** has many **Revisions** and many **Chunks**

## Example dialogue

> **Dev:** "When an **Agent** adds a note, does the **Page** appear immediately?"
> **Owner:** "No. The write lands as a **Proposal**. The page exists only after I accept it, and that acceptance is what creates the **Revision** and queues the **Chunks** for indexing."
> **Dev:** "And the `[[person:Ada Lovelace]]` in the body — does that create her page?"
> **Owner:** "It creates an **Entity** and a **Mention**. She only gets a **Page** if I approve one; then that page *represents* her."

## Flagged ambiguities

- "note" was used for both a page kind and any agent-written content. Resolved: **Note** is a page kind; all authored pages are notes.
- "memory" suggested a component. Resolved: memory is a use case of the wiki — there is no memory store separate from **Pages**.
- "link" was used for wikilinks, stored links, and backlinks. Resolved: a **Wikilink** is authored text, a **Link** is the stored edge it produces, a **Backlink** is the derived reverse query.
- "chat" was proposed as a graph node. Resolved: there is no chat node; a useful conversation is distilled into a **Note**.
