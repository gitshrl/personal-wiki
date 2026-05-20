import { createHash } from "node:crypto";
import type { WikiPage } from "@personal-wiki/wiki-core";

export const defaultEmbeddingConfig = {
  provider: "openai",
  model: "text-embedding-3-small",
  dimensions: 1536
} as const;

export interface WikiChunk {
  id: string;
  pageId: string;
  contentHash: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  embeddingModel: string;
  embeddingDimensions: number;
}

export interface ChunkOptions {
  maxWords?: number;
  overlapWords?: number;
  embeddingModel?: string;
  embeddingDimensions?: number;
}

export function buildIndexText(page: WikiPage): string {
  const sections = [
    `# ${page.title}`,
    page.summary ? `Summary: ${page.summary}` : "",
    `Kind: ${page.kind}`,
    page.sourceType ? `Source type: ${page.sourceType}` : "",
    page.body
  ].filter(Boolean);
  return sections.join("\n\n");
}

export function createPageChunks(page: WikiPage, options: ChunkOptions = {}): WikiChunk[] {
  const maxWords = options.maxWords ?? 220;
  const overlapWords = options.overlapWords ?? Math.min(40, Math.max(0, maxWords - 1));
  const embeddingModel = options.embeddingModel ?? defaultEmbeddingConfig.model;
  const embeddingDimensions = options.embeddingDimensions ?? defaultEmbeddingConfig.dimensions;
  const text = buildIndexText(page);
  const chunks = chunkWords(text, maxWords, overlapWords);
  return chunks.map((chunk, index) => {
    const hash = contentHash(`${page.id}:${index}:${chunk}`);
    return {
      id: `chunk-${hash.slice(0, 16)}`,
      pageId: page.id,
      contentHash: hash,
      chunkIndex: index,
      text: chunk,
      tokenCount: estimateTokens(chunk),
      embeddingModel,
      embeddingDimensions
    };
  });
}

export function chunkWords(text: string, maxWords: number, overlapWords: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (maxWords <= 0) throw new Error("maxWords must be positive");
  if (overlapWords < 0 || overlapWords >= maxWords) {
    throw new Error("overlapWords must be >= 0 and < maxWords");
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlapWords;
  }
  return chunks;
}

export function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35);
}
