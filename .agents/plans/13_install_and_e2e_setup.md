# Install And E2E Setup

Date: 2026-05-22
Status: working setup guide
Scope: local install, services, MCP wiring, skills, and end-to-end smoke checks

## Goal

Bring up a fresh local `personal-wiki` environment and verify the full path:

```txt
repo install
local runtime
api server
web app
agent skill install
MCP client wiring
read smoke
proposal-first write smoke
```

This guide is for local/dev only. Do not run database operations or migrations against remote, shared, staging, or production databases.

## Prerequisites

- Node compatible with the repo toolchain.
- `pnpm` 9.x.
- Local checkout at `/home/dev/code/lab/personal-wiki` or an adjusted path in MCP config.
- Optional Qdrant if semantic vector search is required.
- Optional OpenAI API key if rebuilding the semantic index is required.

Runtime data defaults to:

```txt
~/.personal-wiki/
  personal-wiki.sqlite
  config.json
  resources/
  uploads/
  qdrant/
  logs/
  backups/
```

Use `PERSONAL_WIKI_HOME` only when intentionally creating a separate local wiki runtime.

## Install

From the repo root:

```txt
pnpm install
pnpm typecheck
pnpm test
```

Full local check:

```txt
pnpm check
```

Build check:

```txt
pnpm build
```

## Optional Runtime Config

Create `~/.personal-wiki/config.json` only when semantic indexing or RAG through Qdrant is needed:

```json
{
  "openai": {
    "apiKey": "...",
    "baseUrl": "https://api.openai.com/v1"
  },
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "qdrant": {
    "url": "http://127.0.0.1:6333",
    "collection": "personal_wiki_chunks",
    "vectorSize": 1536,
    "distance": "Cosine"
  }
}
```

Do not commit this file. Do not put secrets in MCP config.

## Start Services

Terminal 1:

```txt
pnpm dev:server
```

Expected:

```txt
personal-wiki server listening on http://localhost:4321
```

Terminal 2:

```txt
pnpm dev
```

Expected:

```txt
http://localhost:3000
```

MCP is stdio. The MCP client should spawn it. Do not run it as a separate HTTP server.

## HTTP Smoke Checks

Check API health:

```txt
curl -sS http://localhost:4321/health
```

Expected:

```json
{
  "ok": true
}
```

Check pages:

```txt
curl -sS "http://localhost:4321/api/pages?limit=1"
```

Expected:

```txt
JSON response with a pages array
```

Check web:

```txt
curl -sS -I http://localhost:3000
```

Expected:

```txt
HTTP/1.1 200 OK
```

## Skill Install

Raw installable skills live in:

```txt
skills/
```

Current skill:

```txt
skills/personal-wiki/SKILL.md
```

Install repo skills into Claude and the shared agent skills directory:

```txt
pnpm install:skills
```

Equivalent explicit command:

```txt
node scripts/install-skills.mjs --dest ~/.claude/skills --dest ~/.agents/skills
```

Expected:

```txt
installed personal-wiki -> ~/.claude/skills/personal-wiki
installed personal-wiki -> ~/.agents/skills/personal-wiki
```

The installer is generic. `~/.claude/skills` and `~/.agents/skills` are the current targets. Do not install into `~/.codex/skills` by default.

Verify installed skill matches source:

```txt
cmp -s skills/personal-wiki/SKILL.md ~/.claude/skills/personal-wiki/SKILL.md
cmp -s skills/personal-wiki/SKILL.md ~/.agents/skills/personal-wiki/SKILL.md
```

## MCP Client Config

Use this for MCP clients that accept `command` and `args`:

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "pnpm",
      "args": ["--dir", "/home/dev/code/lab/personal-wiki", "--filter", "@personal-wiki/mcp", "dev"]
    }
  }
}
```

If the client supports `cwd`:

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "pnpm",
      "args": ["--filter", "@personal-wiki/mcp", "dev"],
      "cwd": "/home/dev/code/lab/personal-wiki"
    }
  }
}
```

If the checkout path changes, update the path before installing the client config.

## MCP Smoke Checks

After connecting an MCP client, call:

```json
{
  "tool": "wiki_runtime",
  "arguments": {}
}
```

Expected:

```txt
runtime paths under ~/.personal-wiki unless PERSONAL_WIKI_HOME is set
```

Call search:

```json
{
  "tool": "wiki_search",
  "arguments": {
    "q": "",
    "limit": 3
  }
}
```

Expected:

```txt
JSON response with pages
```

Call RAG:

```json
{
  "tool": "wiki_rag_query",
  "arguments": {
    "query": "personal wiki MCP setup",
    "limit": 3,
    "depth": 1,
    "format": "markdown"
  }
}
```

Expected:

```txt
Markdown wiki context. If Qdrant is not indexed, SQLite FTS fallback is acceptable.
```

## Proposal-First Write Smoke

Use a harmless proposal, not direct mode:

```json
{
  "tool": "wiki_add_note",
  "arguments": {
    "title": "Smoke test: personal-wiki MCP proposal",
    "body": "Smoke test proposal. This verifies that agent writes default to proposal mode and should not become durable content unless approved.",
    "kind": "note",
    "agentId": "smoke-test",
    "tags": ["smoke-test"],
    "mode": "propose"
  }
}
```

Expected:

```txt
mode = propose
proposal.status = pending
```

Verify through HTTP:

```txt
curl -sS "http://localhost:4321/api/proposals?status=pending&limit=5"
```

Expected:

```txt
pending proposal appears in the response
```

Do not use `mode: "direct"` for smoke tests unless intentionally testing approved application.

## E2E Pass Criteria

The setup passes when:

- `pnpm typecheck` passes.
- `pnpm test` passes.
- API health returns `ok: true`.
- Web responds on `http://localhost:3000`.
- `pnpm install:skills` installs `personal-wiki` into `~/.claude/skills` and `~/.agents/skills`.
- Installed skill matches `skills/personal-wiki/SKILL.md`.
- MCP client can call `wiki_runtime`.
- MCP client can call `wiki_search`.
- MCP client can call `wiki_rag_query`.
- MCP client can create a proposal with `wiki_add_note` and `mode: "propose"`.

## Common Failures

Port already in use:

```txt
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:4321 -sTCP:LISTEN
```

Wrong wiki home:

```txt
echo "$PERSONAL_WIKI_HOME"
```

Missing semantic config:

```txt
cat ~/.personal-wiki/config.json
```

If there is no OpenAI API key or Qdrant is offline, exact search and page reads should still work. Semantic rebuild and vector-backed RAG may fail or fall back depending on the path.

MCP process confusion:

```txt
ps -eo pid,ppid,command | rg 'personal-wiki|@personal-wiki/mcp|tsx.*apps/mcp'
```

The MCP process should normally be owned by the MCP client. Avoid starting duplicate standalone MCP processes.
