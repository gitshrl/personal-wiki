import { describe, expect, it } from "vitest";
import { createWikiRepository, openWikiDatabase } from "@personal-wiki/wiki-db";
import {
  addWikiNote,
  deleteWikiNote,
  getWikiPage,
  queryWikiGraph,
  queryWikiRag,
  rebuildWikiIndex,
  searchWiki
} from "./wiki-tools";
import type {
  EmbeddingProvider,
  QdrantPoint,
  QdrantSearchHit,
  QdrantStore,
  WikiIndexConfig
} from "@personal-wiki/wiki-index";

describe("wiki MCP tool actions", () => {
  it("reads pages as Markdown by default", () => {
    const { context, close } = createContext();

    try {
      context.repo.createPage({
        kind: "topic",
        title: "MCP",
        body: "Model Context Protocol."
      });

      const result = getWikiPage(context, { id: "MCP" });
      expect(result.format).toBe("markdown");
      expect(result.markdown).toContain("# MCP");
    } finally {
      close();
    }
  });

  it("uses proposal mode for add-note by default", () => {
    const { context, close } = createContext();

    try {
      const result = addWikiNote(context, {
        title: "Session summary",
        body: "Save useful agent output.",
        agentId: "codex"
      });

      expect(result.mode).toBe("propose");
      expect(result.proposal?.status).toBe("pending");
    } finally {
      close();
    }
  });

  it("supports direct local note writes and graph queries", () => {
    const { context, close } = createContext();

    try {
      context.repo.createPage({ kind: "topic", title: "Personal wiki" });
      const result = addWikiNote(context, {
        title: "Direct note",
        body: "Connect to [[Personal wiki]].",
        summary: "Short direct note.",
        entityKind: "project",
        agentId: "codex",
        targetPages: ["Personal wiki"],
        mode: "direct"
      });

      expect(result.page?.id).toBe("note-direct-note");
      expect(result.page?.summary).toBe("Short direct note.");
      expect(result.page?.metadata.entityKind).toBe("project");
      expect(result.linkedPageIds).toEqual(["topic-personal-wiki"]);

      const graph = queryWikiGraph(context, { focusId: "Personal wiki" });
      expect(graph.nodes.map((node) => node.id)).toContain("page:topic-personal-wiki");
      expect(graph.nodes.map((node) => node.id)).toContain("page:note-direct-note");
      expect(
        graph.nodes.find((node) => node.id === "page:note-direct-note")?.metadata.entityKinds
      ).toEqual(["project"]);
      expect(graph.entities.map((entity) => entity.title)).toContain("Personal wiki");
      expect(graph.entities.map((entity) => entity.title)).toContain("Direct note");
      expect(graph.pages.map((page) => page.id)).toContain("topic-personal-wiki");
      expect(graph.pages.map((page) => page.id)).toContain("note-direct-note");

      const pageGraph = queryWikiGraph(context, { focusPageId: "note-direct-note" });
      expect(pageGraph.nodes.map((node) => node.id)).toContain("page:note-direct-note");
      expect(pageGraph.nodes.map((node) => node.id)).toContain("page:topic-personal-wiki");

      const search = searchWiki(context, { q: "Direct" });
      expect(search.pages.map((page) => page.id)).toContain("note-direct-note");
    } finally {
      close();
    }
  });

  it("accepts custom note kinds", () => {
    const { context, close } = createContext();

    try {
      const result = addWikiNote(context, {
        title: "Agent note",
        body: "A note can use a domain-specific kind.",
        agentId: "codex",
        kind: "research note",
        mode: "direct"
      });

      expect(result.page).toMatchObject({
        id: "research-note-agent-note",
        kind: "research-note"
      });
    } finally {
      close();
    }
  });

  it("supports proposed and direct note deletion", async () => {
    const { context, close } = createContext();

    try {
      const page = context.repo.createPage({
        kind: "note",
        title: "Temporary note",
        body: "Delete later."
      });

      const proposal = await deleteWikiNote(context, {
        pageId: page.id,
        agentId: "codex"
      });

      expect(proposal).toMatchObject({
        mode: "propose",
        proposal: expect.objectContaining({ status: "pending" })
      });
      expect(context.repo.getPage(page.id)).toBeDefined();

      const deleted = await deleteWikiNote(context, {
        pageId: page.id,
        agentId: "codex",
        mode: "direct"
      });

      expect(deleted).toMatchObject({
        mode: "direct",
        page: expect.objectContaining({ id: page.id }),
        indexCleanup: { qdrantDeleted: true, skipped: false }
      });
      expect(context.repo.getPage(page.id)).toBeNull();
    } finally {
      close();
    }
  });

  it("rebuilds semantic index and returns Markdown context", async () => {
    const qdrant = new FakeQdrantStore();
    const { context, close } = createContext({
      indexConfig: testIndexConfig,
      embeddingProvider: new FakeEmbeddingProvider(),
      qdrant
    });

    try {
      context.repo.createPage({
        kind: "topic",
        title: "Agent RAG",
        body: "Agents can ask for semantic wiki context."
      });

      const rebuild = await rebuildWikiIndex(context);
      expect(rebuild.indexedPages).toBe(1);
      expect(qdrant.points).toHaveLength(1);

      const rag = await queryWikiRag(context, {
        query: "semantic wiki context",
        format: "markdown"
      });
      expect(rag.mode).toBe("semantic");
      expect(rag.markdown).toContain("# Agent RAG");
    } finally {
      close();
    }
  });
});

function createContext(
  options: {
    indexConfig?: WikiIndexConfig | undefined;
    embeddingProvider?: EmbeddingProvider | undefined;
    qdrant?: QdrantStore | undefined;
  } = {}
) {
  const db = openWikiDatabase({ path: ":memory:" });
  const repo = createWikiRepository(db);
  return {
    context: {
      repo,
      indexConfig: options.indexConfig,
      embeddingProvider: options.embeddingProvider,
      qdrant: options.qdrant
    },
    close: () => db.close()
  };
}

const testIndexConfig: WikiIndexConfig = {
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536,
    apiKey: "test-key",
    baseUrl: "https://api.openai.com/v1"
  },
  qdrant: {
    url: "http://127.0.0.1:6333",
    collection: "test_chunks",
    vectorSize: 1536,
    distance: "Cosine"
  }
};

class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => [
      text.toLowerCase().includes("semantic") ? 1 : 0,
      text.toLowerCase().includes("wiki") ? 1 : 0
    ]);
  }
}

class FakeQdrantStore implements QdrantStore {
  readonly points: QdrantPoint[] = [];

  async ensureCollection(): Promise<void> {}

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    this.points.push(...points);
  }

  async deletePagePoints(pageId: string): Promise<void> {
    for (let index = this.points.length - 1; index >= 0; index -= 1) {
      if (this.points[index]?.payload.pageId === pageId) {
        this.points.splice(index, 1);
      }
    }
  }

  async search(vector: number[]): Promise<QdrantSearchHit[]> {
    return this.points.map((point) => ({
      id: point.id,
      score: point.vector.reduce((sum, value, index) => sum + value * (vector[index] ?? 0), 0),
      payload: point.payload
    }));
  }

  async health() {
    return { online: true };
  }
}
