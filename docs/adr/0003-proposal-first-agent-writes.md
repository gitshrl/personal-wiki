# Agent writes default to proposal mode

Every MCP write tool (`wiki_add_note`, `wiki_append_page`, `wiki_link_pages`, deletes) defaults to `mode: "propose"`, creating a proposal row for owner review instead of mutating pages. `mode: "direct"` exists for explicitly trusted flows — user-approved proposal application or an explicit user command — and always records a page revision. Wiki quality is the hard problem; unreviewed agent writes would fill the graph with low-value notes faster than any retrieval improvement could compensate.

## Consequences

- Entity page creation, taxonomy changes, merges, splits, and deletions always require approval; agents suggest entities rather than creating them.
- Direct mode is never used to bypass uncertainty.
- The write policy travels with agents via the installable skill (`skills/personal-wiki/SKILL.md`), not via MCP tool schemas — schemas describe capability, the skill describes judgment.
