import { describe, expect, it } from "vitest";
import { createPage } from "@personal-wiki/wiki-core";
import { createWikiRepository, openWikiDatabase } from "@personal-wiki/wiki-db";
import {
  chunkWords,
  createPageChunks,
  defaultEmbeddingConfig,
  getWikiIndexConfig,
  indexWikiPages,
  qdrantPointIdForChunk,
  queryWikiRag,
  searchWikiSemantic,
  type EmbeddingProvider,
  type QdrantPoint,
  type QdrantSearchHit,
  type QdrantStore
} from "./index";
import type { WikiDatabase } from "@personal-wiki/wiki-db";

const now = "2026-05-20T00:00:00.000Z";

describe("wiki-index", () => {
  it("chunks text with overlap", () => {
    expect(chunkWords("one two three four five six", 3, 1)).toEqual([
      "one two three",
      "three four five",
      "five six"
    ]);
  });

  it("creates page chunks with embedding metadata", () => {
    const page = createPage(
      {
        kind: "article",
        title: "MCP note",
        summary: "MCP write path",
        body: "MCP should support durable notes."
      },
      now
    );

    const chunks = createPageChunks(page, { maxWords: 20 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      pageId: page.id,
      chunkIndex: 0,
      embeddingModel: defaultEmbeddingConfig.model,
      embeddingDimensions: 1536
    });
  });

  it("reads index settings from config and ignores process overrides", () => {
    const config = getWikiIndexConfig(
      {
        PERSONAL_WIKI_HOME: "/tmp/wiki-test",
        OPENAI_API_KEY: "ignored",
        QDRANT_URL: "http://ignored:6333"
      } as NodeJS.ProcessEnv,
      {
        openai: { apiKey: "from-config" },
        embedding: { model: "text-embedding-3-small", dimensions: 1536 },
        qdrant: { url: "http://127.0.0.1:6333", collection: "wiki-test" }
      }
    );

    expect(config.embedding.apiKey).toBe("from-config");
    expect(config.qdrant.url).toBe("http://127.0.0.1:6333");
  });

  it("indexes pages into Qdrant and returns semantic Markdown context", async () => {
    const { db, repo } = createRepository();
    const embeddingProvider = new FakeEmbeddingProvider();
    const qdrant = new FakeQdrantStore();
    const config = getWikiIndexConfig(
      { PERSONAL_WIKI_HOME: "/tmp/wiki-test" } as NodeJS.ProcessEnv,
      {
        openai: { apiKey: "test-key" },
        qdrant: { collection: "test_chunks" }
      }
    );

    try {
      const page = repo.createPage(
        {
          kind: "topic",
          title: "Qdrant memory",
          body: "Qdrant stores vector chunks for semantic wiki search."
        },
        { now }
      );

      const result = await indexWikiPages(repo, {
        config,
        embeddingProvider,
        qdrant,
        now
      });

      expect(result).toMatchObject({
        collection: "test_chunks",
        indexedPages: 1,
        indexedChunks: 1,
        failures: []
      });
      expect(repo.listChunks({ pageId: page.id })[0]).toMatchObject({
        pageId: page.id,
        qdrantPointId: expect.any(String)
      });
      expect(repo.listIndexJobs({ pageId: page.id, status: "pending" })).toEqual([]);
      expect(qdrant.points).toHaveLength(1);

      const semantic = await searchWikiSemantic(repo, {
        query: "semantic vector search",
        config,
        embeddingProvider,
        qdrant
      });
      expect(semantic[0]?.page.id).toBe(page.id);

      const rag = await queryWikiRag(repo, {
        query: "semantic vector search",
        config,
        embeddingProvider,
        qdrant
      });
      expect(rag.mode).toBe("semantic");
      expect(rag.markdown).toContain("# Wiki Context");
      expect(rag.markdown).toContain("# Qdrant memory");
    } finally {
      db.close();
    }
  });

  it("falls back to SQLite FTS when semantic config is unavailable", async () => {
    const { db, repo } = createRepository();

    try {
      repo.createPage(
        {
          kind: "topic",
          title: "SQLite fallback",
          body: "FTS still works without vectors."
        },
        { now }
      );

      const rag = await queryWikiRag(repo, {
        query: "vectors",
        config: getWikiIndexConfig(
          { PERSONAL_WIKI_HOME: "/tmp/wiki-test" } as NodeJS.ProcessEnv,
          {}
        )
      });

      expect(rag.mode).toBe("fts");
      expect(rag.markdown).toContain("SQLite fallback");
    } finally {
      db.close();
    }
  });
});

class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const lower = text.toLowerCase();
      return [
        lower.includes("semantic") ? 1 : 0,
        lower.includes("vector") ? 1 : 0,
        lower.includes("qdrant") ? 1 : 0
      ];
    });
  }
}

class FakeQdrantStore implements QdrantStore {
  readonly points: QdrantPoint[] = [];

  async ensureCollection(): Promise<void> {}

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    for (const point of points) {
      this.points.push(point);
    }
  }

  async deletePagePoints(pageId: string): Promise<void> {
    for (let index = this.points.length - 1; index >= 0; index -= 1) {
      if (this.points[index]?.payload.pageId === pageId) {
        this.points.splice(index, 1);
      }
    }
  }

  async search(vector: number[]): Promise<QdrantSearchHit[]> {
    return this.points
      .map((point) => ({
        id: point.id,
        score: dot(point.vector, vector),
        payload: point.payload
      }))
      .sort((left, right) => right.score - left.score);
  }

  async health() {
    return { online: true };
  }
}

function createRepository(): { db: WikiDatabase; repo: ReturnType<typeof createWikiRepository> } {
  const db = openWikiDatabase({ path: ":memory:" });
  return { db, repo: createWikiRepository(db) };
}

function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}
