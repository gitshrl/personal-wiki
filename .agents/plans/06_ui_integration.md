# UI Integration

## Source

Use `.agents/design/persona-wiki` as the source design.

The real UI uses Next.js 16 and React 19.

The mock already includes:

- Home.
- Sidebar page tree.
- Page view.
- Graph.
- Search and ask.
- Back and forward navigation.
- Wikilink rendering.
- Backlinks and outgoing links.

## Current Implementation

Implemented now:

- `apps/web` is a Next.js App Router app.
- It removed app-level mock data.
- It calls `apps/server` over HTTP JSON for pages and graph data.
- Home, sidebar, page view, search, Markdown-ish wikilinks, and graph view exist.
- Empty and offline states avoid raw fetch errors.
- Home is a compact recent-pages index.
- Page view shows page content, metadata, related pages, and an icon-only graph neighborhood action. It intentionally does not show raw outgoing/backlink columns.
- Sidebar groups derive from stored page kinds.
- Graph legend derives from graph node kinds.
- The page graph action uses the design glyph icon.
- The graph renders heterogeneous nodes and edges from `/api/graph`.
- The graph uses Cytoscape.js for layout, pan, zoom, draggable nodes, focus, and click-to-open.

Remaining this-phase implementation in this repository:

- Ask box.
- Back and forward navigation.
- Proposal review.
- Capture inbox.
- Index status.
- Agent sessions.
- Duplicate and missing-link review.

## Required Screens

Required screens:

- Home. Implemented.
- Sidebar page tree. Implemented with dynamic page kinds.
- Page view. Implemented.
- Graph. Implemented with Cytoscape.js.
- Search. Implemented.
- Ask. Remaining this phase.
- Proposal review.
- Capture inbox.

Additional screens:

- Index status.
- Agent sessions.
- Duplicate review.
- Missing link review.
- Graph saved views.

## HTTP API For UI

The web app should use HTTP JSON through `apps/server`. UI components should not talk to SQLite directly.

Keep database access in `apps/server` and shared packages. Do not put SQLite calls in Next.js client components.

Implemented endpoints:

```txt
GET    /api/pages
GET    /api/pages/:id
GET    /api/pages/:id/markdown
POST   /api/pages
PATCH  /api/pages/:id
GET    /api/pages/:id/backlinks
GET    /api/pages/:id/outgoing
GET    /api/search?q=
GET    /api/index/status
POST   /api/index/rebuild
POST   /api/rag
GET    /api/graph?focus=&depth=
POST   /api/links
GET    /api/proposals
POST   /api/proposals/:id/status
POST   /api/notes
```

Remaining this-phase endpoints:

```txt
POST   /api/ask
GET    /api/captures
POST   /api/captures
GET    /api/proposals/:id
POST   /api/proposals/:id/accept
POST   /api/proposals/:id/reject
GET    /api/index/jobs
```

`/api/index/rebuild` is local owner tooling. The MCP equivalent is `wiki_rebuild_index`; use it only for trusted local agents.

## Graph UI

Current graph uses Cytoscape.js in the Next.js client.

For the graph UI:

- Keep server-side graph queries separate from client layout.
- Render `nodes` and `edges`, not a page-only or entity-only projection.
- Keep page, entity, agent, and resource nodes visually distinct.
- Keep draggable nodes, pan, zoom, focus highlighting, and click-to-open.
- Return only the needed neighborhood when graph size grows.
- Cache graph layouts per saved view if layout cost becomes noticeable.

## Page Rendering

The page view should render body text with:

- Paragraphs.
- Bold text.
- `[[wikilinks]]`.
- Missing link markers.
- Metadata based on page kind and provenance.
- Related pages from links.
- Icon-only graph neighborhood action in the header.

Do not allow arbitrary captured HTML to render directly. Treat captured content as text or sanitized markup.
