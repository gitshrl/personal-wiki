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

## Proactive Memory Check

After any non-trivial task, decide whether the wiki should be updated. Do not wait for the user to
say "remember this" when the work produced clearly durable knowledge.

Create or append a proposal when the session produced:

- a durable decision
- a reusable fix pattern
- an architecture or workflow constraint
- a high-quality source summary
- a changed agent, MCP, UI, or storage policy
- a root cause future agents should know

Before writing:

1. Search existing pages.
2. Prefer appending or updating an existing page.
3. Use `mode: "propose"` by default.
4. Use `kind: "note"` for authored pages.
5. Use at most five meaningful wikilinks.
6. Put new entities under `Suggested Entities`; do not create them directly.

Use direct writes only for explicitly trusted local flows where the user has approved the write
policy. Never direct-write new entity pages, taxonomy changes, merges, splits, or deletions.

## Quality Bar

A good page should be useful six months later without the chat around it.

Before writing, decide the page's job in one sentence. If there is no clear job, do not create a
page; update an existing page or leave the fact in chat.

Write pages as durable notes, not articles:

- Lead with the actual takeaway, decision, constraint, or lesson.
- Keep `summary` as a short subtitle: one sentence, 96 characters or fewer, no title repeat.
- Include source context when it changes how the page should be trusted.
- Preserve the sharp technical detail: failure mode, tradeoff, boundary, invariant, or test rule.
- Say what changed or what future agents should do differently.
- Keep uncertainty explicit when the source was partial or provisional.
- Prefer compact sections and bullets over narrative filler.
- Delete generic background, repeated setup, and obvious explanations.

The page is not high quality if it only summarizes a conversation, lists every named thing, or
creates relationships that are not visible in the prose.

## Page Contract

Every agent-written page should satisfy this checklist:

- `kind` is `note` unless the page has a truly different lifecycle.
- `summary` is present, one sentence, 96 characters or fewer, and does not repeat the title.
- Source/session context lives in metadata, not in the body.
- Use `sourceSessionId` for a real stable id; use `sourceSessionLabel` for a human-readable session label.
- The body starts with the page title, then useful sections. Do not add boilerplate source lines.
- No `Related`, `See also`, or link-dump section.
- At most five meaningful wikilinks/entity mentions per page, inline where the idea is discussed.
- Extra named things stay plain text unless they are one of the page's core relationships.

## Page Shape

Keep pages concise and skimmable. Use only the sections needed:

Use wikilinks in the body as the visible relationship surface. Do not add a separate `Related`,
`See also`, or link-dump section when the same relationship is already expressed by meaningful
`[[wikilinks]]` in context.

Write wikilinks only for durable, meaningful relationships:

- Existing pages: `[[Exact Page Title]]`
- Approved or clearly useful typed entities: `[[entity-kind:Entity Title]]`
- At most five meaningful entity mentions per page

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
- `sourceSessionId` when available; omit it when unknown instead of writing an empty string
- `sourceSessionLabel` when there is useful human session/source context but no stable session id
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
