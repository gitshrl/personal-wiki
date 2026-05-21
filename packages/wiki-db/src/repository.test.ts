import { describe, expect, it } from "vitest";
import {
  createWikiRepository,
  openWikiDatabase,
  resolveGraphFocusNode,
  resolvePageReference
} from "./index";
import type { WikiDatabase } from "./index";

const now = "2026-05-20T00:00:00.000Z";

describe("WikiRepository", () => {
  it("opens an in-memory database, migrates schema, and stores pages", () => {
    withRepository(({ db, repo }) => {
      const page = repo.createPage(
        {
          kind: "topic",
          title: "MCP",
          body: "Model Context Protocol notes.",
          summary: "Agent protocol.",
          metadata: { tags: ["agent-memory"] }
        },
        { now, changedBy: "agent-test" }
      );

      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pages'").get()
      ).toBeTruthy();
      expect(repo.getPage(page.id)).toMatchObject({
        id: page.id,
        title: "MCP",
        metadata: { tags: ["agent-memory"] }
      });
      expect(repo.listPageRevisions(page.id)).toHaveLength(1);
      expect(repo.searchPages("Protocol").map((result) => result.id)).toEqual([page.id]);
    });
  });

  it("stores custom page kinds without schema changes", () => {
    withRepository(({ repo }) => {
      const researchNote = repo.createPage(
        {
          kind: "research note",
          title: "Design note",
          body: "A durable note with a custom kind."
        },
        { now }
      );

      expect(researchNote).toMatchObject({
        id: "research-note-design-note",
        kind: "research-note"
      });
      expect(repo.listPages({ kind: "research-note" }).map((page) => page.id)).toEqual([
        researchNote.id
      ]);
      expect(repo.listPages({ kind: "research note" }).map((page) => page.id)).toEqual([
        researchNote.id
      ]);
    });
  });

  it("replaces derived wikilinks on page save and keeps manual links", () => {
    withRepository(({ repo }) => {
      const mcp = repo.createPage({ kind: "topic", title: "MCP" }, { now });
      const wiki = repo.createPage({ kind: "topic", title: "Personal wiki" }, { now });
      const note = repo.createPage(
        {
          kind: "article",
          title: "Session note",
          body: "Connect [[MCP]] and [[Personal wiki]]."
        },
        { now }
      );

      const manualLink = repo.addLink({
        fromPageId: note.id,
        toPageId: mcp.id,
        origin: "manual",
        createdAt: now
      });

      repo.updatePage(
        note.id,
        { body: "Keep only [[Personal wiki]]." },
        { now: "2026-05-20T00:01:00.000Z" }
      );

      const links = repo.listLinks({ fromPageId: note.id });

      expect(links).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: manualLink.id,
            toPageId: mcp.id,
            origin: "manual"
          }),
          expect.objectContaining({
            toPageId: wiki.id,
            origin: "wikilink",
            sourceText: "[[Personal wiki]]"
          })
        ])
      );
      expect(links).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            toPageId: mcp.id,
            origin: "wikilink"
          })
        ])
      );
    });
  });

  it("resolves wikilinks through aliases", () => {
    withRepository(({ repo }) => {
      const memory = repo.createPage({ kind: "topic", title: "Agent memory" }, { now });
      repo.addAlias({ pageId: memory.id, alias: "AI memory" });

      const note = repo.createPage(
        {
          kind: "article",
          title: "Alias note",
          body: "Remember [[AI memory]]."
        },
        { now }
      );

      expect(repo.listLinks({ fromPageId: note.id })).toEqual([
        expect.objectContaining({
          toPageId: memory.id,
          origin: "wikilink",
          sourceText: "[[AI memory]]"
        })
      ]);
      expect(resolvePageReference(repo, "AI memory")?.id).toBe(memory.id);
    });
  });

  it("derives generic entity nodes and links from page content", () => {
    withRepository(({ repo }) => {
      const note = repo.createPage(
        {
          kind: "article",
          title: "Entity note",
          body: "Connect [[protocol:MCP]] with [[organization:OpenAI]] and [[Personal wiki]]."
        },
        { now }
      );

      const graph = repo.getEntityGraph();
      const knowledgeGraph = repo.getKnowledgeGraph();
      expect(graph.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "protocol", title: "MCP" }),
          expect.objectContaining({ kind: "organization", title: "OpenAI" }),
          expect.objectContaining({ kind: "entity", title: "Personal wiki" })
        ])
      );
      expect(graph.mentions.map((mention) => mention.pageId)).toEqual([note.id, note.id, note.id]);
      expect(graph.links).toHaveLength(3);
      expect(knowledgeGraph.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: `page:${note.id}`, kind: "page", title: "Entity note" }),
          expect.objectContaining({ kind: "entity", subtype: "protocol", title: "MCP" }),
          expect.objectContaining({ kind: "entity", subtype: "organization", title: "OpenAI" })
        ])
      );
      expect(knowledgeGraph.edges.map((edge) => edge.kind).sort()).toEqual([
        "co_mentioned_with",
        "co_mentioned_with",
        "co_mentioned_with",
        "mentions",
        "mentions",
        "mentions"
      ]);
      expect(resolveGraphFocusNode(repo, knowledgeGraph, { focusPageId: note.id })).toMatchObject({
        id: `page:${note.id}`,
        kind: "page"
      });

      const openAiEntity = graph.entities.find((entity) => entity.title === "OpenAI");
      expect(openAiEntity).toBeDefined();
      expect(
        resolveGraphFocusNode(repo, knowledgeGraph, { focusEntityId: openAiEntity?.id })
      ).toMatchObject({
        kind: "entity",
        title: "OpenAI"
      });

      repo.updatePage(
        note.id,
        { body: "Keep [[protocol:MCP]] connected to [[Personal wiki]]." },
        { now: "2026-05-20T00:01:00.000Z" }
      );

      const nextGraph = repo.getEntityGraph();
      expect(nextGraph.entities).toEqual(
        expect.not.arrayContaining([expect.objectContaining({ title: "OpenAI" })])
      );
      expect(nextGraph.links).toHaveLength(1);
    });
  });

  it("collapses page-backed entities into their page node in the knowledge graph", () => {
    withRepository(({ repo }) => {
      const page = repo.createPage(
        {
          kind: "design",
          title: "Personal Wiki System Design",
          body: "Keep [[protocol:MCP]] connected.",
          metadata: { entityKind: "project" }
        },
        { now }
      );

      const graph = repo.getKnowledgeGraph();
      const pageBackedEntity = graph.entities.find(
        (entity) => entity.title === "Personal Wiki System Design"
      );

      expect(pageBackedEntity).toBeDefined();
      expect(graph.nodes.filter((node) => node.title === "Personal Wiki System Design")).toEqual([
        expect.objectContaining({
          id: `page:${page.id}`,
          kind: "page",
          metadata: expect.objectContaining({
            entityIds: [pageBackedEntity?.id],
            entityKinds: ["project"]
          })
        })
      ]);
      expect(graph.nodes).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            id: `entity:${pageBackedEntity?.id}`,
            kind: "entity"
          })
        ])
      );
      expect(graph.edges).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            fromNodeId: `page:${page.id}`,
            toNodeId: `page:${page.id}`
          })
        ])
      );
      expect(
        resolveGraphFocusNode(repo, graph, { focusEntityId: pageBackedEntity?.id })
      ).toMatchObject({
        id: `page:${page.id}`,
        kind: "page"
      });
    });
  });

  it("deletes pages and cascades local graph records", () => {
    withRepository(({ repo }) => {
      const target = repo.createPage({ kind: "topic", title: "Target" }, { now });
      const note = repo.createPage(
        {
          kind: "note",
          title: "Temporary note",
          body: "Delete this but keep [[Target]]."
        },
        { now }
      );

      expect(repo.listLinks({ fromPageId: note.id })).toHaveLength(1);
      expect(repo.getEntityGraph().mentions.map((mention) => mention.pageId)).toContain(note.id);

      const deleted = repo.deletePage(note.id);

      expect(deleted.id).toBe(note.id);
      expect(repo.getPage(note.id)).toBeNull();
      expect(repo.listLinks({ fromPageId: note.id })).toHaveLength(0);
      expect(repo.listPageRevisions(note.id)).toHaveLength(0);
      expect(repo.listIndexJobs({ pageId: note.id })).toHaveLength(0);
      expect(repo.getEntityGraph().mentions.map((mention) => mention.pageId)).not.toContain(
        note.id
      );
      expect(repo.getPage(target.id)).toBeDefined();
    });
  });

  it("reads backlinks, outgoing pages, neighborhoods, paths, and missing links", () => {
    withRepository(({ repo }) => {
      const mcp = repo.createPage({ kind: "topic", title: "MCP" }, { now });
      const wiki = repo.createPage({ kind: "topic", title: "Personal wiki" }, { now });
      const memory = repo.createPage({ kind: "topic", title: "Agent memory" }, { now });
      const note = repo.createPage({ kind: "article", title: "Note" }, { now });
      const orphan = repo.createPage({ kind: "article", title: "Orphan" }, { now });

      repo.addLink({ fromPageId: note.id, toPageId: mcp.id, origin: "manual", createdAt: now });
      repo.addLink({ fromPageId: mcp.id, toPageId: wiki.id, origin: "manual", createdAt: now });
      repo.addLink({ fromPageId: wiki.id, toPageId: memory.id, origin: "manual", createdAt: now });
      repo.updatePage(note.id, { body: "[[Missing page]]" }, { now });

      expect(repo.getBacklinks(mcp.id).map((page) => page.id)).toEqual([note.id]);
      expect(repo.getOutgoing(mcp.id).map((page) => page.id)).toEqual([wiki.id]);
      expect(
        repo
          .getPageNeighborhood(mcp.id, { depth: 1 })
          ?.pages.map((page) => page.id)
          .sort()
      ).toEqual([mcp.id, note.id, wiki.id].sort());
      expect(repo.findPaths(note.id, memory.id, { maxDepth: 3 })).toEqual([
        [note.id, mcp.id, wiki.id, memory.id]
      ]);
      expect(repo.listOrphanPages("article").map((page) => page.id)).toEqual([orphan.id]);
      expect(repo.findMissingLinks()).toEqual([
        expect.objectContaining({
          pageId: note.id,
          target: "Missing page"
        })
      ]);
    });
  });

  it("stores proposal basics and explicit revisions", () => {
    withRepository(({ repo }) => {
      const page = repo.createPage({ kind: "topic", title: "MCP" }, { now });
      const proposal = repo.createProposal({
        title: "Add MCP note",
        proposedByAgentId: "agent-test",
        payload: { changes: [{ pageId: page.id }] },
        createdAt: now
      });

      repo.updateProposalStatus(proposal.id, "accepted", {
        appliedAt: "2026-05-20T00:02:00.000Z"
      });
      repo.addPageRevision({
        pageId: page.id,
        title: "MCP",
        body: "Updated body",
        changedBy: "agent-test",
        changeReason: "manual test",
        createdAt: "2026-05-20T00:03:00.000Z"
      });

      expect(repo.getProposal(proposal.id)).toMatchObject({
        status: "accepted",
        appliedAt: "2026-05-20T00:02:00.000Z",
        payload: { changes: [{ pageId: page.id }] }
      });
      expect(repo.listPageRevisions(page.id).map((revision) => revision.body)).toContain(
        "Updated body"
      );
    });
  });

  it("queues index jobs and stores page chunks", () => {
    withRepository(({ repo }) => {
      const page = repo.createPage(
        {
          kind: "topic",
          title: "Semantic search",
          body: "Embeddings should stay aligned with saved pages."
        },
        { now }
      );

      expect(repo.listIndexJobs({ pageId: page.id })).toEqual([
        expect.objectContaining({
          pageId: page.id,
          reason: "page_created",
          status: "pending"
        })
      ]);

      const chunks = repo.replacePageChunks(
        page.id,
        [
          {
            id: "chunk-one",
            pageId: page.id,
            contentHash: "hash-one",
            chunkIndex: 0,
            text: "Semantic search chunk",
            tokenCount: 12,
            qdrantPointId: "point-one"
          }
        ],
        { now }
      );

      expect(chunks).toEqual([
        expect.objectContaining({
          id: "chunk-one",
          pageId: page.id,
          qdrantPointId: "point-one"
        })
      ]);

      const job = repo.createIndexJob({
        pageId: page.id,
        reason: "test_rebuild",
        status: "running",
        createdAt: now
      });
      expect(
        repo.updateIndexJobStatus(job.id, "done", {
          finishedAt: "2026-05-20T00:04:00.000Z"
        })
      ).toMatchObject({
        status: "done",
        finishedAt: "2026-05-20T00:04:00.000Z"
      });
    });
  });
});

function withRepository(
  run: (context: { db: WikiDatabase; repo: ReturnType<typeof createWikiRepository> }) => void
): void {
  const db = openWikiDatabase({ path: ":memory:" });
  const repo = createWikiRepository(db);

  try {
    run({ db, repo });
  } finally {
    db.close();
  }
}
