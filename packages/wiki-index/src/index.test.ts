import { describe, expect, it } from "vitest";
import { createPage } from "@personal-wiki/wiki-core";
import { chunkWords, createPageChunks, defaultEmbeddingConfig } from "./index";

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
});
