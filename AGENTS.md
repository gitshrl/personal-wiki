# Agent Guide

Personal Wiki: an agent-maintained wiki and knowledge graph exposed over MCP. Start with:

- [ARCHITECTURE.md](ARCHITECTURE.md) — system shape, seams, invariants
- [CONTEXT.md](CONTEXT.md) — domain language
- [docs/adr/](docs/adr/) — decisions and their rationale
- [docs/design/persona-wiki/](docs/design/persona-wiki/) — the UI design source
- [skills/personal-wiki/SKILL.md](skills/personal-wiki/SKILL.md) — the wiki write policy agents follow
- [README.md](README.md) — install, service startup, MCP wiring

## Commands

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev          # web UI on :3000
pnpm dev:server   # HTTP API on :4321
pnpm dev:mcp      # stdio MCP server
```

## Rules

- Database operations and migrations run against local/dev databases only; tests use in-memory SQLite. Remote, shared, staging, or production targets require the owner's explicit approval for that exact target.
- Never commit databases, Qdrant snapshots, resources, uploads, logs, secrets, or private captures. Runtime state lives under `~/.personal-wiki`.
- OpenAI, embedding, and Qdrant settings come from `~/.personal-wiki/config.json`, not environment variables.
- Write documentation in English.
