# UI Integration

## Source

Use `.agents/design/persona-wiki` as the source design.

The real UI uses Next.js 16 and React 19.

The mock already includes:

- Home.
- Sidebar entity tree.
- Entity page.
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
- Home, sidebar, entity page, search, Markdown-ish wikilinks, and graph view exist.
- Empty and offline states avoid raw fetch errors.
- Sidebar groups and graph legend derive from stored page kinds.
- The graph action uses the design glyph icon.

Still planned:

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
- Sidebar entity tree. Implemented with dynamic page kinds.
- Entity page. Implemented.
- Graph. Implemented with hand-rolled SVG layout.
- Search. Implemented.
- Ask. Planned.
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
GET    /api/graph?focus=&depth=
POST   /api/links
GET    /api/proposals
POST   /api/proposals/:id/status
POST   /api/notes
```

Planned endpoints:

```txt
POST   /api/ask
GET    /api/captures
POST   /api/captures
GET    /api/proposals/:id
POST   /api/proposals/:id/accept
POST   /api/proposals/:id/reject
GET    /api/index/jobs
POST   /api/index/rebuild
```

`/api/index/rebuild` should be owner-only. Do not expose it through MCP without explicit admin tooling.

## Graph UI

Current graph is hand-rolled SVG. It is fine for the mock.

For the graph UI:

- Use Cytoscape.js if the graph needs stable layout, selection, or more than a few hundred nodes.
- Keep server-side graph queries separate from client layout.
- Return only the needed neighborhood, not the whole database graph.
- Cache graph layouts per saved view if layout cost becomes noticeable.

## Page Rendering

The entity page should render body text with:

- Paragraphs.
- Bold text.
- `[[wikilinks]]`.
- Missing link markers.
- Backlinks.
- Outgoing links.
- Metadata based on entity kind.

Do not allow arbitrary captured HTML to render directly. Treat captured content as text or sanitized markup.
