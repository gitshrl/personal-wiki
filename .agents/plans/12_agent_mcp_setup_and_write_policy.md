# Agent MCP Setup And Write Policy

Date: 2026-05-22
Status: proposed operating contract
Scope: how a new agent should be configured to use `personal-wiki` without bloating the wiki

## Principle

MCP setup gives an agent tools. It does not teach judgment.

Use two separate layers:

1. MCP config: wires the `personal-wiki` server into the agent.
2. Agent skill: tells the agent when to read, when to write, what to write, and when to ask for approval.

Do not rely on tool schemas alone. Tool schemas describe capability. The skill describes taste, approval boundaries, and anti-bloat rules.

## New Agent Setup

Give every agent both pieces.

### 1. MCP Config

For local development, the MCP client should spawn the stdio server:

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

If the client supports `cwd`, this is equivalent:

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

The MCP client owns this process. Do not start MCP as a separate HTTP service.

Runtime data lives under `~/.personal-wiki` by default:

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

Use `PERSONAL_WIKI_HOME` only when intentionally running a separate wiki home.

### 2. Agent Skill

The raw installable skill source is:

```txt
skills/personal-wiki/SKILL.md
```

Install it into both agent skill directories:

```txt
~/.claude/skills/personal-wiki/SKILL.md
~/.agents/skills/personal-wiki/SKILL.md
```

Use:

```txt
pnpm install:skills
```

The installer is generic:

```txt
node scripts/install-skills.mjs --dest ~/.claude/skills --dest ~/.agents/skills
```

Do not install this repo skill into `~/.codex/skills` by default. `skills/` is the source of truth for raw installable skills; `~/.claude/skills` and `~/.agents/skills` are the current install targets.

The skill content should include this operating policy:

```txt
Use personal-wiki as durable project memory.
Search before writing.
Prefer updating existing pages over creating new pages.
Use kind=note for authored wiki pages; plan/design/article are not separate page kinds.
Default all writes to proposal mode.
Use direct mode only when the user explicitly asks for a direct write or approves a proposal.
Do not create entity pages just because names are mentioned.
Suggest new entities for user approval.
Do not store secrets, credentials, private keys, tokens, or raw sensitive dumps.
```

This policy should travel with Claude through the installed skill. The MCP config should remain only tool wiring.

## Read Flow

Before answering project-history, architecture, planning, or decision questions:

1. Use `wiki_rag_query` for compiled semantic context.
2. Use `wiki_search` for exact titles, keywords, and known names.
3. Use `wiki_get_page` before citing, appending to, or linking a page.
4. Use `wiki_graph_query` when relationships matter.

Read tools are safe by default.

## Write Flow

Agents should write only durable knowledge:

- decisions
- constraints
- plans
- glossary terms
- architecture facts
- open questions
- project-specific workflows
- useful source summaries

Agents should not write:

- raw chat transcripts
- incidental names
- temporary debugging noise
- one-off command output
- secrets or secret-adjacent config
- generic facts better found in public docs

Default flow:

```txt
search existing wiki
read matching pages
decide whether knowledge is durable
prepare proposed note or append
include suggested entities separately
write with mode=propose
wait for user approval before direct writes or new entity creation
```

Use `mode: "direct"` only after explicit approval.

## Proactive Memory Check

Agents should actively check whether a session produced durable wiki knowledge. They should not
wait for the user to say "remember this" when the work clearly changed project memory.

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

Direct writes are reserved for explicitly trusted local flows where the user has approved the write
policy. Never direct-write new entity pages, taxonomy changes, merges, splits, or deletions.

## Page Shape

A good agent-written page is concise and skimmable.

Use `kind: "note"` for authored wiki pages. Planning notes, design notes, articles, and session summaries are all notes. Distinguish them with titles, tags, headings, and metadata instead of page kinds.

Keep `summary` as a short subtitle: one sentence, 96 characters or fewer, no title repeat.

Every agent-written page should satisfy this contract:

- `kind` is `note` unless the page has a truly different lifecycle.
- `summary` is present, one sentence, 96 characters or fewer, and does not repeat the title.
- Source/session context lives in metadata, not in the body.
- Use `sourceSessionId` for a real stable id; use `sourceSessionLabel` for a human-readable session label.
- The body starts with the page title, then useful sections. Do not add boilerplate source lines.
- No `Related`, `See also`, or link-dump section.
- At most five meaningful wikilinks/entity mentions per page, inline where the idea is discussed.
- Extra named things stay plain text unless they are one of the page's core relationships.

Use wikilinks in the body as the visible relationship surface. Do not add a separate `Related`,
`See also`, or link-dump section when the same relationship is already expressed by meaningful
`[[wikilinks]]` in context.

Wikilinks should be sparse and intentional:

- Existing pages: `[[Exact Page Title]]`
- Approved or clearly useful typed entities: `[[entity-kind:Entity Title]]`
- At most five meaningful entity mentions per page

Recommended structure:

```md
# Short title

Summary: one or two sentences when the page is long enough to need it.

## Context

Why this exists. Mention project, repo, source session, or date when useful.

## Decisions

- Durable decision.
- Constraint that future agents should preserve.

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

Do not force every section. Use only the sections needed.

## Write Metadata

Every write should include:

- `agentId`
- `sourceSessionId` when available; omit it when unknown instead of writing an empty string
- `sourceSessionLabel` when there is useful human session/source context but no stable session id
- `targetPages` when linking to known existing pages
- `tags` when they help retrieval
- `mode: "propose"` by default

Example:

```json
{
  "title": "Agent MCP write policy",
  "body": "Decision: agents using [[Personal wiki]] should default to proposal mode and require approval before creating new entity pages.",
  "kind": "note",
  "agentId": "codex",
  "sourceSessionId": "session-2026-05-22-personal-wiki-mcp-policy",
  "targetPages": ["Personal wiki", "MCP"],
  "tags": ["agent-workflow", "mcp", "write-policy"],
  "mode": "propose"
}
```

## Entity Policy

Entity creation is the main bloat risk.

Rules:

- Each page should have at most five meaningful entity mentions.
- Do not create entity pages just because an entity is mentioned.
- Link existing pages when the match is exact or clearly intended.
- Suggest new entities only. User approval is required before creating or canonicalizing them.
- Create entities only when they are durable: recurring, decision-relevant, project-relevant, or useful for future retrieval.
- Ignore incidental names, throwaway tools, one-off URLs, package names, vague concepts, and secret-adjacent config unless they become important.

The five mentions should be the concepts the page is really about, not every proper noun, tool, package, URL, company, or benchmark named in passing.

Approval needed:

- creating a new entity page
- creating a new taxonomy or page kind
- mass-linking old pages
- merging pages
- splitting pages
- direct deletion

Approval not needed:

- reading pages
- mentioning an entity as plain text
- linking an exact existing page in a proposal
- proposing an append to an existing page

Suggested entity format:

```md
## Suggested Entities

- `personal-wiki MCP`
  action: create page
  reason: recurring integration point for agent memory.

- `Qdrant`
  action: link existing if present, otherwise leave plain text
  reason: implementation detail unless indexing work repeats.

- `OpenAI API key`
  action: do not create
  reason: secret-adjacent configuration detail.
```

## Proposal Approval Flow

Current implementation:

- MCP write tools default to proposal mode.
- The HTTP API can list proposals with `/api/proposals`.
- Proposal status can be changed.
- There is not yet a full apply-proposal implementation in the web app.

Practical current flow:

```txt
agent creates proposal
user reviews proposal payload
user approves or rejects
agent applies approved content with direct write
agent rebuilds index if RAG freshness matters
```

Target product flow:

```txt
agent creates proposal
proposal inbox shows diff, page targets, and suggested entities
user approves, edits, or rejects
app applies approved changes
app marks proposal as applied
app optionally rebuilds semantic index
```

Until the apply flow exists, proposals are the review artifact, not the final write.

## Mode Rules

Use `propose` for:

- new notes
- appends to important pages
- link creation
- entity suggestions
- deletions
- anything from an untrusted or newly installed agent

Use `direct` for:

- user-approved proposal application
- explicit user command to write directly
- local trusted automation with narrow scope

Never use `direct` to bypass uncertainty.

## Index Rules

SQLite is durable. Qdrant is derived.

After approved direct writes:

- no index rebuild needed for ordinary browsing or exact search
- rebuild index when semantic RAG freshness matters
- rebuild specific pages when possible

Do not treat Qdrant as source of truth.

## Smoke Test

After wiring a new agent:

1. Call `wiki_runtime`.
2. Call `wiki_search` with an empty query and small limit.
3. Call `wiki_rag_query` for a known project term.
4. Create one harmless proposal, not a direct write.
5. Confirm the proposal appears through `/api/proposals` or the repository tools.

The agent is not considered ready until both tool access and write policy are working.
