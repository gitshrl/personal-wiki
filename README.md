# Personal Wiki

Local agent memory with an MCP server, HTTP API, and web UI.

## Prerequisites

- Node.js 20.x
- pnpm 9.x
- A local checkout of this repo

Runtime data is stored under `~/.personal-wiki` by default:

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

Set `PERSONAL_WIKI_HOME` only when you want a separate local runtime.

## Install

```sh
pnpm install
pnpm typecheck
pnpm test
```

Optional: install the bundled agent skill into Claude Code and shared agent skills:

```sh
pnpm install:skills
```

This installs `skills/personal-wiki/SKILL.md` into:

```txt
~/.claude/skills/personal-wiki
~/.agents/skills/personal-wiki
```

## Start The API Server

```sh
pnpm dev:server
```

The API listens on:

```txt
http://localhost:4321
```

Smoke check:

```sh
curl -sS http://localhost:4321/health
```

## Start The Web UI

In a second terminal:

```sh
pnpm dev
```

Open:

```txt
http://localhost:3000
```

The web app proxies `/wiki-api/*` to the API server on `http://127.0.0.1:4321`.

## Install The MCP Server

The MCP server is stdio-based. Do not start it as a standalone HTTP service. Your MCP client should spawn it.

Use the same Node binary that ran `pnpm install`. This matters because the server loads `better-sqlite3`.

Find the Node path:

```sh
node -p "process.execPath"
```

In this checkout, the MCP entrypoint is:

```txt
/home/dev/code/lab/personal-wiki/apps/mcp/node_modules/tsx/dist/cli.mjs
/home/dev/code/lab/personal-wiki/apps/mcp/src/index.ts
```

If your repo path is different, replace `/home/dev/code/lab/personal-wiki`.

### Claude Code

```sh
claude mcp add personal-wiki -- \
  /usr/local/node-v20.12.0-linux-x64/bin/node \
  /home/dev/code/lab/personal-wiki/apps/mcp/node_modules/tsx/dist/cli.mjs \
  /home/dev/code/lab/personal-wiki/apps/mcp/src/index.ts
```

Verify:

```sh
claude mcp get personal-wiki
claude mcp list
```

### Codex

```sh
codex mcp add personal-wiki -- \
  /usr/local/node-v20.12.0-linux-x64/bin/node \
  /home/dev/code/lab/personal-wiki/apps/mcp/node_modules/tsx/dist/cli.mjs \
  /home/dev/code/lab/personal-wiki/apps/mcp/src/index.ts
```

Verify:

```sh
codex mcp get personal-wiki
codex mcp list
```

### Generic MCP JSON

Use this shape for clients that accept `command` and `args`:

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "/usr/local/node-v20.12.0-linux-x64/bin/node",
      "args": [
        "/home/dev/code/lab/personal-wiki/apps/mcp/node_modules/tsx/dist/cli.mjs",
        "/home/dev/code/lab/personal-wiki/apps/mcp/src/index.ts"
      ],
      "cwd": "/home/dev/code/lab/personal-wiki"
    }
  }
}
```

## MCP Smoke Test

After the client connects, call:

```json
{
  "tool": "wiki_runtime",
  "arguments": {}
}
```

Expected: runtime paths under `~/.personal-wiki`, unless `PERSONAL_WIKI_HOME` is set.

Then try:

```json
{
  "tool": "wiki_search",
  "arguments": {
    "q": "",
    "limit": 3
  }
}
```

Writes should use proposal mode by default:

```json
{
  "tool": "wiki_add_note",
  "arguments": {
    "title": "Smoke test: personal-wiki MCP proposal",
    "body": "Smoke test proposal. This verifies that agent writes create proposals before durable writes.",
    "kind": "note",
    "agentId": "smoke-test",
    "tags": ["smoke-test"],
    "mode": "propose"
  }
}
```

Check pending proposals:

```sh
curl -sS "http://localhost:4321/api/proposals?status=pending&limit=5"
```

## Common Failures

Port already in use:

```sh
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:4321 -sTCP:LISTEN
```

Wrong wiki home:

```sh
echo "$PERSONAL_WIKI_HOME"
```

MCP startup fails during initialize:

```sh
node -p "process.versions.modules"
claude mcp get personal-wiki
codex mcp get personal-wiki
```

If the MCP config launches a different Node runtime than the one used for `pnpm install`, reinstall dependencies with that Node or update the MCP command to the correct absolute Node path.
