# Initial Plan Complement

## Purpose

This file captures complementary ideas from the initial personal-wiki plan and the Karpathy LLM Wiki inspiration.

It does not replace the current plan. Keep the current direction:

- SQLite is the durable source of truth.
- Qdrant is a derived index.
- The UI comes from `.agents/design/persona-wiki`.
- MCP is the read/write agent memory interface.
- Default writes are proposal-first.

## Source Inspiration

Karpathy's LLM Wiki pattern is the root idea:

```txt
raw sources
-> LLM-maintained wiki
-> persistent links and synthesis
-> queries get smarter
```

The key lesson is compounding. The system should not rediscover the same facts through RAG every time. It should turn sources, questions, and durable conversation takeaways into a maintained artifact.

This project adapts that pattern:

```txt
raw captures
-> agent ingest
-> SQLite-backed pages
-> graph links and backlinks
-> Qdrant index
-> custom HTML reading/thinking UI
-> MCP read/write memory
```

## Complementary Ideas To Keep

The initial plan adds useful product ideas:

- Capture inbox: low-friction staging for messy input.
- Raw sources: immutable source material with metadata and hashes.
- Structured knowledge: normalized pages, captures, claims, reports, and signals.
- Knowledge graph: graph is not only visualization; it supports traversal and reasoning.
- HTML interface: dense, quiet, fast reading and thinking surface.
- API and MCP layer: agents should update the system without knowing file layout.
- Operations loop: capture, ingest, query, compile, lint, review, render.
- Social connectors: Reddit saves and X/Twitter bookmarks as high-value capture streams.
- Canvas: spatial thinking surface for projects, comparisons, and brainstorms.

## Compounding Loop

The system should make every useful interaction increase leverage.

```txt
capture source or conversation takeaway
-> agent extracts durable notes
-> wiki pages update
-> links and backlinks update
-> graph neighborhoods improve
-> search and RAG improve
-> agents answer with less rediscovery
-> useful answers get filed back
```

This loop is the product. UI, MCP, SQLite, and Qdrant exist to support it.

## MCP Read/Write Role

MCP should not be limited to reading memory.

Agents should be able to:

- Search memory.
- Read pages.
- Get backlinks and graph neighborhoods.
- Capture raw input.
- Add a new note.
- Append a note to an existing page.
- Link pages.
- Create proposals.
- Log session summaries.
- Trigger safe review or lint workflows.

Default mode is proposal-first. Trusted agents can get direct write permissions for safe operations when configured.

## Outside Current Scope

Remaining this-phase work in this repository:

- Full typed edge system.
- Social account connectors.
- Canvas board editing.
- Static HTML compile pipeline.
- Weekly reports.
- Automated source refresh.
- Direct writes for untrusted agents.

These ideas are useful, but implementation should stay aligned with the SQLite-backed page and MCP plan.

## References

- Karpathy LLM Wiki: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Initial personal-wiki plan: https://gist.github.com/gitshrl/31efda23ceef34802b79614b09db041e
