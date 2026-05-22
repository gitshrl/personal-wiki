---
name: personal-wiki
description: Use the personal-wiki MCP server as durable project memory with proposal-first writes and entity approval. Use when reading or writing wiki memory, project history, decisions, architecture context, agent workflows, MCP wiki tools, or when the user asks to remember, save, or record knowledge.
---

# Personal Wiki

## Core Rule

MCP gives the tools. This skill gives the write discipline.

Use `personal-wiki` for durable knowledge, not chat logs. Preserve decisions, constraints, plans, architecture facts, glossary terms, open questions, and project-specific workflows.

Use `kind: "note"` for authored wiki pages. Do not create separate page kinds for plan, design, article, draft, or session-note shape; those belong in the title, tags, headings, or metadata.

## Read Flow

Before answering project-history, architecture, planning, or decision questions:

1. Use `wiki_rag_query` for compiled semantic context.
2. Use `wiki_search` for exact titles, keywords, and known names.
3. Use `wiki_get_page` before citing, appending to, or linking a page.
4. Use `wiki_graph_query` when relationships matter.

Read tools are safe by default.

## Write Flow

Search before writing. Prefer updating existing pages over creating new pages.

Default every write to `mode: "propose"`. Use `mode: "direct"` only when the user explicitly asks for a direct write or approves a proposal.

Write only durable knowledge:

- decisions
- constraints
- plans
- glossary terms
- architecture facts
- open questions
- project-specific workflows
- useful source summaries

Do not write:

- raw chat transcripts
- incidental names
- temporary debugging noise
- one-off command output
- secrets or secret-adjacent config
- generic facts better found in public docs

## Page Shape

Keep pages concise and skimmable. Use only the sections needed:

```md
## Context

Why this exists. Mention project, repo, source session, or date when useful.

## Decisions

- Durable decision.
- Constraint future agents should preserve.

## Notes

- Supporting detail.
- Link important existing pages with [[wikilinks]].

## Open Questions

- Anything unresolved.

## Suggested Entities

- `Name`
  action: create, link existing, or leave plain text
  reason: why it is durable or why it should not become an entity
```

## Metadata

Every write should include:

- `agentId`
- `sourceSessionId` when available
- `targetPages` when linking to known existing pages
- `tags` when useful for retrieval
- `mode: "propose"` by default

## Entity Policy

Entity creation is the main bloat risk.

- Each page should have at most five meaningful entity mentions.
- Do not create entity pages just because names are mentioned.
- Link existing pages when the match is exact or clearly intended.
- Suggest new entities only. User approval is required before creating or canonicalizing them.
- Create entities only when recurring, decision-relevant, project-relevant, or useful for future retrieval.
- Ignore incidental names, throwaway tools, one-off URLs, package names, vague concepts, and secret-adjacent config unless they become important.

The five mentions should be the concepts the page is really about, not every proper noun or tool named in passing.

Approval is required for new entity pages, new taxonomies, mass-linking old pages, merging pages, splitting pages, and direct deletion.

## Proposal Flow

Current flow:

```txt
agent creates proposal
user reviews proposal payload
user approves or rejects
agent applies approved content with direct write
agent rebuilds index if RAG freshness matters
```

Until an apply-proposal UI exists, proposals are review artifacts, not final writes.
