# Runtime state lives under ~/.personal-wiki, settings in config.json

All mutable runtime data — SQLite database, config, resources, uploads, Qdrant volume, logs, backups — lives under `~/.personal-wiki` (overridable via `PERSONAL_WIKI_HOME`), never inside the repository. OpenAI, embedding, and Qdrant settings are read from `~/.personal-wiki/config.json`, deliberately not from environment variables: every MCP client, the HTTP server, and the indexer must resolve identical settings without each client's env being configured, and the API key stays out of shell profiles and tracked source.

## Consequences

- The repo contains only source, tests, docs, and design references; it stays portable.
- Databases, snapshots, uploads, logs, and secrets are never committed.
- When no config key is present, semantic indexing is unavailable and RAG falls back to SQLite FTS rather than failing.
