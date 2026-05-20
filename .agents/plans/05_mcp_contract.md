# MCP Contract

## Direction

MCP should expose the wiki using:

- Resources for readable wiki context.
- Tools for read, write, capture, add-note, and search actions.
- Prompts for repeatable workflows.

Use stdio transport for local agents. Keep Streamable HTTP as the protected transport for shared or remote clients.

MCP is not just a read layer. It is the memory interface agents use to both source prior knowledge and add new durable notes.

## Resources

Agent-facing page and note resources return Markdown by default.

Use JSON for search results, graph neighborhoods, proposal payloads, and machine-oriented metadata. Markdown is the default for anything an agent should read as context.

Resource URI templates:

```txt
wiki://page/{id}
wiki://page/by-slug/{slug}
wiki://page/{id}/backlinks
wiki://page/{id}/outgoing
wiki://graph/neighborhood/{id}?depth=1
wiki://recent/pages
wiki://recent/captures
wiki://proposal/{id}
wiki://agent/{agent_id}/notes
```

Markdown page resource shape:

```md
---
id: topic-mcp
kind: topic
title: MCP
updated_at: 2026-05-20T22:00:00+07:00
tags: [agent-memory, protocol]
---

# MCP

Model Context Protocol is the tool and context interface agents use to read and write this wiki.

## Body

MCP connects [[Personal wiki]] with [[Agent memory]]. Agents use it to search, read pages, add notes, and propose changes.

## Backlinks

- [[Personal wiki]]
- [[Agent memory]]

## Outgoing

- [[Personal wiki]]
- [[Agent memory]]
```

JSON page resource shape is available through `format: "json"`:

```json
{
  "id": "topic-mcp",
  "kind": "topic",
  "title": "MCP",
  "summary": "...",
  "body": "...",
  "backlinks": [{ "id": "...", "title": "..." }],
  "outgoing": [{ "id": "...", "title": "..." }],
  "updated_at": "..."
}
```

## Tools

Read tools:

```txt
wiki_search
wiki_get_page
wiki_get_backlinks
wiki_get_outgoing
wiki_graph_query
wiki_find_paths
wiki_rag_query
wiki_recent
```

Read tools should accept a `format` argument when returning page content:

```json
{
  "id": "topic-mcp",
  "format": "markdown"
}
```

Default:

```txt
format = markdown
```

Write and proposal tools:

```txt
wiki_capture
wiki_add_note
wiki_append_note
wiki_propose_changes
wiki_create_page
wiki_update_page
wiki_add_link
wiki_log_session
wiki_accept_proposal
wiki_reject_proposal
```

Default policy:

- Read tools are allowed.
- Safe capture and add-note tools can write directly for trusted local agents.
- Risky writes create proposals by default.
- Direct page updates require trusted local config.
- Proposal acceptance should normally happen in UI.

Write tools must create audit log entries. Direct writes must also create page revisions.

Current stdio implementation:

```txt
wiki_search
wiki_get_page
wiki_graph_query
wiki_add_note
wiki_append_page
wiki_link_pages
wiki_runtime
```

`wiki_get_page` returns Markdown by default. `wiki_add_note`, `wiki_append_page`, and `wiki_link_pages` default to proposal mode. `mode: "direct"` is available for local trusted use and writes to SQLite.

## Example: `wiki_rag_query`

Input:

```json
{
  "query": "What do I know about MCP as agent memory?",
  "kinds": ["topic", "article"],
  "limit": 8,
  "include_graph_context": true
}
```

Output:

```json
{
  "answer_context": [
    {
      "page_id": "topic-mcp",
      "title": "MCP",
      "kind": "topic",
      "snippet": "Model Context Protocol...",
      "score": 0.92,
      "reason": "title and semantic match"
    }
  ],
  "suggested_resources": ["wiki://page/topic-mcp?format=markdown"]
}
```

## Example: `wiki_propose_changes`

Input:

```json
{
  "session_id": "session_...",
  "title": "Codex session summary: MCP wiki manager",
  "changes": [
    {
      "op": "append",
      "page": "Personal wiki",
      "body": "Decision: expose the wiki through MCP...",
      "links": ["MCP", "Agent memory"]
    }
  ]
}
```

## Example: `wiki_add_note`

Input:

```json
{
  "title": "Codex note: MCP should be read/write",
  "body": "Decision: MCP is not only for querying memory. Agents should also use it to add notes, append useful session outcomes, and connect pages with [[wikilinks]].",
  "kind": "article",
  "agent_id": "agent-codex",
  "source_session_id": "session_...",
  "target_pages": ["Personal wiki", "MCP", "Agent memory"],
  "mode": "propose"
}
```

Output:

```json
{
  "status": "proposal_created",
  "proposal_id": "proposal_...",
  "affected_pages": ["topic-personal-wiki", "topic-mcp", "topic-agent-memory"]
}
```

## Prompts

Prompts:

```txt
use_personal_wiki_as_memory
summarize_session_to_wiki
ingest_source_to_wiki
audit_wiki_graph
find_related_notes
```

Prompt rules:

- Search first.
- Read only relevant pages.
- State uncertainty.
- Propose wiki changes instead of writing directly.
- Use `[[wikilinks]]` in proposed body text.
- Prefer adding durable notes over saving full chat transcripts.

## Transports

Support stdio transport for local Claude, Codex, and custom agent clients.

Keep Streamable HTTP as a separate transport path in `apps/mcp`, protected by auth and Origin validation before remote access is enabled.

Local HTTP should bind to `127.0.0.1`.
