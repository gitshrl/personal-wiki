# Using Personal Wiki MCP With Agents

## Goal

Use `personal-wiki` as an MCP server that agents can read from and write to.

Agents should use it to:

- Search existing wiki context before answering.
- Read relevant pages as Markdown.
- Add durable notes after useful work.
- Propose risky changes instead of editing pages directly.
- Link new notes back to relevant pages.

## Runtime

Default runtime state lives under:

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

The MCP server creates and migrates the SQLite database when it starts.

Set `PERSONAL_WIKI_HOME` only if you want another runtime directory. Default is `~/.personal-wiki`.

Semantic indexing is planned, not implemented yet. It should use `text-embedding-3-small` and only run when `OPENAI_API_KEY` is available in the environment or config.

Current search is SQLite-backed:

- `wiki_search` uses FTS5 and recent-page fallback.
- `wiki_graph_query` reads SQLite links.
- `wiki_get_page` returns Markdown by default.

## Install

From the repo root:

```txt
pnpm install
pnpm --filter @personal-wiki/mcp typecheck
pnpm --filter @personal-wiki/mcp test
```

## Install Without Clone

Current state:

- Clone plus `pnpm install` is the best development path.
- The MCP server is not packaged as a standalone installer yet.
- Agents can run it through `pnpm --dir /home/dev/code/lab/personal-wiki --filter @personal-wiki/mcp dev`.

Best distribution path:

1. Publish an npm CLI package, for example `@personal-wiki/mcp`.
2. Expose a bin command, for example `personal-wiki-mcp`.
3. Keep runtime data in `~/.personal-wiki`.
4. Let MCP clients run it with `npx` or a global install.

Target client config after publish:

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "npx",
      "args": ["-y", "@personal-wiki/mcp"],
      "env": {
        "PERSONAL_WIKI_HOME": "/home/dev/.personal-wiki"
      }
    }
  }
}
```

For this project, npm is the best first publishing target because MCP clients already know how to spawn Node commands. A Homebrew formula or curl installer can come later if the server grows beyond a TypeScript package.

## MCP Client Config

Use this for MCP clients that accept `command`, `args`, and `env`.

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "pnpm",
      "args": [
        "--dir",
        "/home/dev/code/lab/personal-wiki",
        "--filter",
        "@personal-wiki/mcp",
        "dev"
      ],
      "env": {
        "PERSONAL_WIKI_HOME": "/home/dev/.personal-wiki"
      }
    }
  }
}
```

If the client supports `cwd`, this also works:

```json
{
  "mcpServers": {
    "personal-wiki": {
      "command": "pnpm",
      "args": ["--filter", "@personal-wiki/mcp", "dev"],
      "cwd": "/home/dev/code/lab/personal-wiki",
      "env": {
        "PERSONAL_WIKI_HOME": "/home/dev/.personal-wiki"
      }
    }
  }
}
```

The MCP client should spawn this process. Do not run it as a separate HTTP server.

## Tools

Current tools:

```txt
wiki_search
wiki_get_page
wiki_graph_query
wiki_add_note
wiki_append_page
wiki_link_pages
wiki_runtime
```

Resources:

```txt
wiki://recent
wiki://page/{id}
```

## Read Examples

Search:

```json
{
  "q": "MCP personal wiki",
  "limit": 5
}
```

Read a page as Markdown:

```json
{
  "id": "topic-mcp",
  "format": "markdown"
}
```

Read a graph neighborhood:

```json
{
  "focusPageId": "topic-personal-wiki",
  "depth": 2,
  "limit": 100
}
```

## Write Examples

Default write mode is `propose`.

Add a note proposal:

```json
{
  "title": "Codex note: MCP write flow",
  "body": "Decision: agents should use [[MCP]] to add durable notes to [[Personal wiki]], not only read memory.",
  "kind": "note",
  "agentId": "codex",
  "targetPages": ["Personal wiki", "MCP"],
  "tags": ["mcp", "agent-workflow"],
  "mode": "propose"
}
```

Direct trusted write:

```json
{
  "title": "Session summary: wiki API wiring",
  "body": "Implemented local API routes and MCP tools. Next step: connect the Next.js UI to the API.",
  "kind": "chat",
  "agentId": "codex",
  "targetPages": ["Personal wiki"],
  "mode": "direct"
}
```

Append to a page as proposal:

```json
{
  "pageId": "topic-personal-wiki",
  "body": "Open question: decide how proposal review should look in the UI.",
  "agentId": "claude",
  "mode": "propose"
}
```

Link pages directly:

```json
{
  "fromPageId": "article-session-summary-wiki-api-wiring",
  "toPageId": "topic-personal-wiki",
  "agentId": "codex",
  "mode": "direct"
}
```

## Agent Instructions

Tell agents this:

```txt
Use the personal-wiki MCP server as durable project memory.
Search before answering project-history questions.
Read matching pages as Markdown.
When new durable knowledge appears, call wiki_add_note.
Use mode=propose by default.
Use mode=direct only when i explicitly ask you to write.
Prefer short notes with [[wikilinks]] over full chat transcripts.
Do not store secrets, credentials, private keys, tokens, or raw sensitive dumps.
```

## Safety Rules

- Use `mode: "propose"` by default.
- Use `mode: "direct"` only for trusted agents.
- Keep notes concise.
- Use `[[wikilinks]]` for important concepts.
- Do not save secrets.
- Do not treat Qdrant as durable state.
- Do not edit remote, shared, staging, or production databases through this MCP unless the owner explicitly asks for that exact target.

## Smoke Test

Run this from the repo root:

```txt
pnpm --filter @personal-wiki/mcp typecheck
pnpm --filter @personal-wiki/mcp test
```

Then connect an MCP client and call:

```json
{
  "tool": "wiki_runtime",
  "arguments": {}
}
```

Expected runtime path:

```txt
/home/dev/.personal-wiki
```
