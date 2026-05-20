# UI Integration

## Source

Use `.agents/design/persona-wiki` as the source design.

The real UI will use Next.js.

The mock already includes:

- Home.
- Sidebar entity tree.
- Entity page.
- Graph.
- Search and ask.
- Back and forward navigation.
- Wikilink rendering.
- Backlinks and outgoing links.

## Port Plan

1. Create a Next.js app in `apps/web`.
2. Move the mock into App Router pages and components.
3. Replace global `window.LOKA_DATA` with API calls.
4. Call `apps/server` for API data.
5. Keep the current views first.
6. Keep the current visual language.
7. Remove or hide the tweak panel if it is only a design artifact.
8. Add proposal review and capture inbox when backend endpoints exist.

## Required Screens

Required screens:

- Home.
- Sidebar entity tree.
- Entity page.
- Graph.
- Search and ask.
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

Suggested endpoints:

```txt
GET    /api/pages
GET    /api/pages/:id
POST   /api/pages
PATCH  /api/pages/:id
GET    /api/pages/:id/backlinks
GET    /api/pages/:id/outgoing
GET    /api/search?q=
POST   /api/ask
GET    /api/graph?focus=&depth=
GET    /api/captures
POST   /api/captures
GET    /api/proposals
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
