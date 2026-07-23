# Agent-facing reads return Markdown by default

Page reads, note reads, and RAG context (`wiki_get_page`, `wiki_rag_query`, `wiki://page/{id}`) return Markdown with frontmatter, body, backlinks, and outgoing links. JSON is reserved for machine-shaped data: search results, graph queries, proposals, metadata. Markdown keeps memory portable across Claude, Codex, and any MCP client, keeps context windows clean, and keeps agent-written memory human-readable — pages, not opaque vector blobs.

## Consequences

- Read tools accept `format: "json"` as the explicit opt-out.
- `wiki_graph_query` returns JSON `nodes` and `edges`; it is a machine surface.
