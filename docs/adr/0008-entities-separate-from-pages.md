# Entities are graph nodes distinct from pages

Entities (people, projects, protocols, companies) are their own rows derived from typed wikilinks (`[[person:Ada Lovelace]]`), page-title `entityKind` metadata, and page content. A page can *represent* an entity, but entities do not require pages — this lets the graph accumulate lightweight domain objects without forcing a full page (and its review cost) for every named thing. The alternative, pages-as-the-only-nodes (the Obsidian model), was rejected because it either bloats the wiki with stub pages or loses the entity layer entirely.

## Consequences

- Entity mentions and entity-to-entity co-mention edges are re-derived on every page save, alongside `origin = wikilink` page links; manual links are left untouched.
- Wikilinks authored in the page body are the only source of visible links; `targetPages` metadata creates graph edges but never rewrites prose.
- Entity creation is the main bloat risk, so it sits behind the approval rules in [0003](0003-proposal-first-agent-writes.md).
