import { describe, expect, it } from "vitest";
import { createWikiRepository, openWikiDatabase } from "@personal-wiki/wiki-db";
import { createServerApp } from "./app";
import type {
  EmbeddingProvider,
  QdrantPoint,
  QdrantSearchHit,
  QdrantStore,
  WikiIndexConfig
} from "@personal-wiki/wiki-index";

describe("server app", () => {
  it("returns quiet empty payloads for a new local wiki", async () => {
    const { app, close } = createTestApp();

    try {
      const pages = await app.request("/api/pages");
      const pagesJson = (await pages.json()) as { pages: unknown[] };
      expect(pagesJson.pages).toEqual([]);

      const largerPageList = await app.request("/api/pages?limit=500");
      expect(largerPageList.status).toBe(200);

      const graph = await app.request("/api/graph");
      const graphJson = (await graph.json()) as {
        nodes: unknown[];
        edges: unknown[];
        entities: unknown[];
        mentions: unknown[];
      };
      expect(graphJson).toMatchObject({ nodes: [], edges: [], entities: [], mentions: [] });

      const search = await app.request("/api/search?q=missing");
      const searchJson = (await search.json()) as { pages: unknown[] };
      expect(searchJson.pages).toEqual([]);
    } finally {
      close();
    }
  });

  it("creates pages, returns markdown, and searches", async () => {
    const { app, close } = createTestApp();

    try {
      const created = await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "topic",
          title: "MCP",
          body: "Model Context Protocol links agents to tools."
        })
      });

      expect(created.status).toBe(201);
      const createdJson = (await created.json()) as { page: { id: string } };

      const markdown = await app.request(`/api/pages/${createdJson.page.id}/markdown`);
      expect(markdown.headers.get("content-type")).toContain("text/markdown");
      expect(await markdown.text()).toContain("# MCP");

      const search = await app.request("/api/search?q=Protocol");
      const searchJson = (await search.json()) as { pages: Array<{ title: string }> };
      expect(searchJson.pages.map((page) => page.title)).toEqual(["MCP"]);
    } finally {
      close();
    }
  });

  it("normalizes custom page kinds", async () => {
    const { app, close } = createTestApp();

    try {
      const response = await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "research note",
          title: "Planning note"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as { page: { id: string; kind: string } };
      expect(json.page).toMatchObject({
        id: "research-note-planning-note",
        kind: "research-note"
      });
    } finally {
      close();
    }
  });

  it("stores add-note requests as proposals by default", async () => {
    const { app, close } = createTestApp();

    try {
      const response = await app.request("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Session summary",
          body: "Useful MCP notes should compound in the wiki.",
          agentId: "codex"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as { mode: string; proposal: { status: string } };
      expect(json.mode).toBe("propose");
      expect(json.proposal.status).toBe("pending");
    } finally {
      close();
    }
  });

  it("can directly add notes and target-page links for local trusted use", async () => {
    const { app, close } = createTestApp();

    try {
      await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "topic", title: "Personal wiki" })
      });

      const response = await app.request("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Direct note",
          body: "Connect this note to a topic.",
          summary: "Short direct note.",
          agentId: "codex",
          sourceSessionLabel: "local test session",
          targetPages: ["Personal wiki"],
          mode: "direct"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as {
        mode: string;
        page: { id: string; summary?: string; metadata: Record<string, unknown> };
        linkedPageIds: string[];
      };
      expect(json.mode).toBe("direct");
      expect(json.page.summary).toBe("Short direct note.");
      expect(json.page.metadata.sourceSessionLabel).toBe("local test session");
      expect(json.linkedPageIds).toEqual(["topic-personal-wiki"]);

      const graph = await app.request(`/api/graph?focus=${json.page.id}`);
      expect(graph.status).toBe(200);
      const graphJson = (await graph.json()) as {
        nodes: Array<{ id: string; kind: string; title: string }>;
        pages: Array<{ id: string }>;
      };
      expect(graphJson.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: `page:${json.page.id}`, kind: "page" }),
          expect.objectContaining({ id: "page:topic-personal-wiki", kind: "page" })
        ])
      );
      expect(graphJson.pages.map((page) => page.id)).toContain("topic-personal-wiki");
      expect(graphJson.pages.map((page) => page.id)).toContain(json.page.id);
    } finally {
      close();
    }
  });

  it("returns heterogeneous graph nodes from wikilinks without requiring pages", async () => {
    const { app, close } = createTestApp();

    try {
      await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "note",
          title: "Graph note",
          body: "Connect [[person:Andre Karpathy]] and [[organization:OpenAI]]."
        })
      });

      const graph = await app.request("/api/graph");
      const graphJson = (await graph.json()) as {
        nodes: Array<{ kind: string; subtype?: string; title: string }>;
        pages: Array<{ id: string; title: string }>;
        entities: Array<{ id: string; kind: string; title: string }>;
        edges: Array<{ kind: string }>;
      };
      expect(graphJson.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "page", title: "Graph note" }),
          expect.objectContaining({ kind: "entity", subtype: "person", title: "Andre Karpathy" }),
          expect.objectContaining({ kind: "entity", subtype: "organization", title: "OpenAI" })
        ])
      );
      expect(graphJson.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "person", title: "Andre Karpathy" }),
          expect.objectContaining({ kind: "organization", title: "OpenAI" })
        ])
      );
      expect(graphJson.edges.map((edge) => edge.kind).sort()).toEqual([
        "co_mentioned_with",
        "mentions",
        "mentions"
      ]);

      const personEntity = graphJson.entities.find((entity) => entity.title === "Andre Karpathy");
      expect(personEntity).toBeDefined();
      const neighborhood = await app.request(`/api/graph?focusEntityId=${personEntity?.id}`);
      expect(neighborhood.status).toBe(200);
      const neighborhoodJson = (await neighborhood.json()) as {
        center: { kind: string; title: string };
      };
      expect(neighborhoodJson.center).toMatchObject({
        kind: "entity",
        title: "Andre Karpathy"
      });

      const graphNotePage = graphJson.pages.find((page) => page.title === "Graph note");
      expect(graphNotePage).toBeDefined();
      const pageNeighborhood = await app.request(`/api/graph?focusPageId=${graphNotePage?.id}`);
      expect(pageNeighborhood.status).toBe(200);
      const pageNeighborhoodJson = (await pageNeighborhood.json()) as {
        center: { kind: string; title: string };
      };
      expect(pageNeighborhoodJson.center).toMatchObject({
        kind: "page",
        title: "Graph note"
      });

      const missingFocus = await app.request("/api/graph?focusPageId=missing-page");
      expect(missingFocus.status).toBe(404);
    } finally {
      close();
    }
  });

  it("rebuilds the semantic index and serves RAG context", async () => {
    const qdrant = new FakeQdrantStore();
    const { app, close } = createTestApp({
      indexConfig: testIndexConfig,
      embeddingProvider: new FakeEmbeddingProvider(),
      qdrant
    });

    try {
      await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "topic",
          title: "Vector search",
          body: "Qdrant stores embeddings for semantic wiki retrieval."
        })
      });

      const status = await app.request("/api/index/status");
      const statusJson = (await status.json()) as {
        status: { embedding: { configured: boolean } };
      };
      expect(statusJson.status.embedding.configured).toBe(true);

      const rebuild = await app.request("/api/index/rebuild", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      expect(rebuild.status).toBe(200);
      expect(qdrant.points).toHaveLength(1);

      const rag = await app.request("/api/rag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "semantic embeddings" })
      });
      const ragJson = (await rag.json()) as { mode: string; markdown: string };
      expect(ragJson.mode).toBe("semantic");
      expect(ragJson.markdown).toContain("# Vector search");
    } finally {
      close();
    }
  });

  it("returns 404 for targeted index rebuilds with missing pages", async () => {
    const { app, close } = createTestApp({
      indexConfig: testIndexConfig,
      embeddingProvider: new FakeEmbeddingProvider(),
      qdrant: new FakeQdrantStore()
    });

    try {
      const response = await app.request("/api/index/rebuild", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageIds: ["missing-page"] })
      });
      expect(response.status).toBe(404);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Page not found for indexing: missing-page");
    } finally {
      close();
    }
  });
});

function createTestApp(
  options: {
    indexConfig?: WikiIndexConfig | undefined;
    embeddingProvider?: EmbeddingProvider | undefined;
    qdrant?: QdrantStore | undefined;
  } = {}
) {
  const db = openWikiDatabase({ path: ":memory:" });
  const repo = createWikiRepository(db);
  return {
    app: createServerApp({
      repo,
      runtimePaths: {
        homeDir: "/tmp/personal-wiki-test",
        databasePath: ":memory:",
        configPath: "/tmp/personal-wiki-test/config.json",
        resourcesDir: "/tmp/personal-wiki-test/resources",
        uploadsDir: "/tmp/personal-wiki-test/uploads",
        qdrantStorageDir: "/tmp/personal-wiki-test/qdrant",
        logsDir: "/tmp/personal-wiki-test/logs",
        backupsDir: "/tmp/personal-wiki-test/backups"
      },
      indexConfig: options.indexConfig,
      embeddingProvider: options.embeddingProvider,
      qdrant: options.qdrant
    }),
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
      text.toLowerCase().includes("embedding") ? 1 : 0
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
