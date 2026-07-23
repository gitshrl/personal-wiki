# Web, HTTP API, and MCP are separate apps over one shared core

The monorepo keeps `apps/web` (Next.js UI), `apps/server` (Hono HTTP API), and `apps/mcp` (stdio MCP) as separate processes, all calling the same `wiki-core`/`wiki-db`/`wiki-index` packages. Graph, search, and write logic exist exactly once; the apps own only transport, registration, and shaping. Collapsing MCP into the web app or the API was rejected: the MCP process is client-spawned with its own lifecycle, and framework overlap between the three surfaces would couple their deploys and their failure modes.
