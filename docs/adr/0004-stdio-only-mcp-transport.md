# MCP runs over stdio only

The MCP server is spawned by the client over stdio, never started as a standalone service. A remote Streamable HTTP transport is allowed only behind auth and Origin validation; without those, exposing a read/write memory bus over HTTP is an open door to the wiki. The local HTTP API binds to `127.0.0.1` for the same reason.

## Consequences

- MCP client config must launch the server with the same Node binary used for `pnpm install` — `better-sqlite3` is a native dependency and a different runtime fails the handshake with an ABI mismatch.
- The web UI reaches the API through the Next.js `/wiki-api/*` proxy rather than calling another origin.
