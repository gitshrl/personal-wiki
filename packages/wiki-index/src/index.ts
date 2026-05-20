import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  getPersonalWikiRuntimePaths,
  renderPageMarkdown,
  type PageGraph,
  type WikiPage
} from "@personal-wiki/wiki-core";
import type { SaveChunkInput, WikiRepository, WikiStoredChunk } from "@personal-wiki/wiki-db";

export const defaultEmbeddingConfig = {
  provider: "openai",
  model: "text-embedding-3-small",
  dimensions: 1536
} as const;

export const defaultQdrantConfig = {
  url: "http://127.0.0.1:6333",
  collection: "personal_wiki_chunks",
  vectorSize: defaultEmbeddingConfig.dimensions,
  distance: "Cosine"
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

export interface EmbeddingConfig {
  provider: "openai";
  model: string;
  dimensions: number;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
}

export interface QdrantConfig {
  url: string;
  collection: string;
  vectorSize: number;
  distance: "Cosine" | "Dot" | "Euclid" | "Manhattan";
}

export interface WikiIndexConfig {
  embedding: EmbeddingConfig;
  qdrant: QdrantConfig;
}

export interface PersonalWikiConfigFile {
  openai?: {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
  };
  embedding?: {
    provider?: "openai" | undefined;
    model?: string | undefined;
    dimensions?: number | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
  };
  qdrant?: {
    url?: string | undefined;
    collection?: string | undefined;
    vectorSize?: number | undefined;
    distance?: QdrantConfig["distance"] | undefined;
  };
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantSearchHit {
  id: string | number;
  score: number;
  payload?: Record<string, unknown> | undefined;
}

export interface QdrantStore {
  ensureCollection(): Promise<void>;
  upsertPoints(points: QdrantPoint[]): Promise<void>;
  deletePagePoints(pageId: string): Promise<void>;
  search(vector: number[], options?: { limit?: number | undefined }): Promise<QdrantSearchHit[]>;
  health(): Promise<QdrantHealth>;
}

export interface QdrantHealth {
  online: boolean;
  error?: string | undefined;
}

export interface WikiIndexStatus {
  embedding: {
    provider: string;
    model: string;
    dimensions: number;
    configured: boolean;
  };
  qdrant: {
    url: string;
    collection: string;
    online: boolean;
    error?: string | undefined;
  };
  chunks: number;
  pendingJobs: number;
}

export interface IndexWikiPagesOptions {
  pageIds?: string[] | undefined;
  pages?: WikiPage[] | undefined;
  limit?: number | undefined;
  reason?: string | undefined;
  now?: string | undefined;
  config?: WikiIndexConfig | undefined;
  embeddingProvider?: EmbeddingProvider | undefined;
  qdrant?: QdrantStore | undefined;
}

export interface IndexWikiPagesResult {
  collection: string;
  indexedPages: number;
  indexedChunks: number;
  skippedPages: number;
  failures: Array<{ pageId: string; error: string }>;
}

export interface WikiSemanticSearchOptions {
  query: string;
  limit?: number | undefined;
  config?: WikiIndexConfig | undefined;
  embeddingProvider?: EmbeddingProvider | undefined;
  qdrant?: QdrantStore | undefined;
}

export interface WikiSemanticSearchResult {
  page: WikiPage;
  chunk?: WikiStoredChunk | undefined;
  score: number;
  snippet: string;
  qdrantPointId: string;
}

export interface WikiRagQueryOptions extends WikiSemanticSearchOptions {
  depth?: number | undefined;
}

export interface WikiRagQueryResult {
  query: string;
  mode: "semantic" | "fts";
  markdown: string;
  results: Array<{
    page: WikiPage;
    score?: number | undefined;
    snippet: string;
    reason: string;
    chunkId?: string | undefined;
  }>;
  expandedPageIds: string[];
  error?: string | undefined;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    index: number;
    embedding: number[];
  }>;
}

interface QdrantSearchResponse {
  result?: unknown;
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

export function readPersonalWikiConfig(env = process.env): PersonalWikiConfigFile {
  const configPath = getPersonalWikiRuntimePaths(env).configPath;
  if (!existsSync(configPath)) return {};

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid personal wiki config: ${configPath}`);
  }

  return parsed as PersonalWikiConfigFile;
}

export function getWikiIndexConfig(
  env = process.env,
  fileConfig: PersonalWikiConfigFile = readPersonalWikiConfig(env)
): WikiIndexConfig {
  const configDimensions = Number(fileConfig.embedding?.dimensions);
  const vectorSize =
    Number.isFinite(configDimensions) && configDimensions > 0
      ? configDimensions
      : defaultEmbeddingConfig.dimensions;
  const configVectorSize = Number(fileConfig.qdrant?.vectorSize);
  const qdrantVectorSize =
    Number.isFinite(configVectorSize) && configVectorSize > 0 ? configVectorSize : vectorSize;
  return {
    embedding: {
      provider: "openai",
      model: fileConfig.embedding?.model?.trim() || defaultEmbeddingConfig.model,
      dimensions: vectorSize,
      apiKey:
        fileConfig.openai?.apiKey?.trim() || fileConfig.embedding?.apiKey?.trim() || undefined,
      baseUrl:
        fileConfig.openai?.baseUrl?.trim() ||
        fileConfig.embedding?.baseUrl?.trim() ||
        "https://api.openai.com/v1"
    },
    qdrant: {
      url: fileConfig.qdrant?.url?.trim() || defaultQdrantConfig.url,
      collection: fileConfig.qdrant?.collection?.trim() || defaultQdrantConfig.collection,
      vectorSize: qdrantVectorSize,
      distance: fileConfig.qdrant?.distance ?? defaultQdrantConfig.distance
    }
  };
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: EmbeddingConfig) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required in ~/.personal-wiki/config.json");
    }

    const response = await fetch(`${trimTrailingSlash(this.config.baseUrl ?? "")}/embeddings`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings failed: ${response.status} ${await response.text()}`);
    }

    const json = (await response.json()) as OpenAIEmbeddingResponse;
    return json.data
      .slice()
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  }
}

export class QdrantHttpStore implements QdrantStore {
  private readonly baseUrl: string;

  constructor(private readonly config: QdrantConfig) {
    this.baseUrl = trimTrailingSlash(config.url);
  }

  async ensureCollection(): Promise<void> {
    const collectionUrl = this.collectionUrl();
    const existing = await fetch(collectionUrl);
    if (existing.ok) return;
    if (existing.status !== 404) {
      throw new Error(
        `Qdrant collection check failed: ${existing.status} ${await existing.text()}`
      );
    }

    const created = await fetch(collectionUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: this.config.vectorSize,
          distance: this.config.distance
        }
      })
    });

    if (!created.ok) {
      throw new Error(`Qdrant collection create failed: ${created.status} ${await created.text()}`);
    }
  }

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    const response = await fetch(`${this.collectionUrl()}/points?wait=true`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ points })
    });

    if (!response.ok) {
      throw new Error(`Qdrant upsert failed: ${response.status} ${await response.text()}`);
    }
  }

  async deletePagePoints(pageId: string): Promise<void> {
    const response = await fetch(`${this.collectionUrl()}/points/delete?wait=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "pageId",
              match: { value: pageId }
            }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Qdrant delete failed: ${response.status} ${await response.text()}`);
    }
  }

  async search(
    vector: number[],
    options: { limit?: number | undefined } = {}
  ): Promise<QdrantSearchHit[]> {
    const limit = normalizeLimit(options.limit ?? 8, 50);
    const body = {
      vector,
      limit,
      with_payload: true,
      with_vector: false
    };
    const response = await fetch(`${this.collectionUrl()}/points/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (response.status === 404) {
      return this.searchWithQueryApi(vector, limit);
    }

    if (!response.ok) {
      throw new Error(`Qdrant search failed: ${response.status} ${await response.text()}`);
    }

    return parseQdrantHits((await response.json()) as QdrantSearchResponse);
  }

  async health(): Promise<QdrantHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      if (response.ok) return { online: true };
      return { online: false, error: `${response.status} ${await response.text()}` };
    } catch (error) {
      return { online: false, error: errorMessage(error) };
    }
  }

  private async searchWithQueryApi(vector: number[], limit: number): Promise<QdrantSearchHit[]> {
    const response = await fetch(`${this.collectionUrl()}/points/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: vector,
        limit,
        with_payload: true,
        with_vector: false
      })
    });

    if (!response.ok) {
      throw new Error(`Qdrant query failed: ${response.status} ${await response.text()}`);
    }

    return parseQdrantHits((await response.json()) as QdrantSearchResponse);
  }

  private collectionUrl(): string {
    return `${this.baseUrl}/collections/${encodeURIComponent(this.config.collection)}`;
  }
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

export async function getWikiIndexStatus(
  repo: WikiRepository,
  options: {
    config?: WikiIndexConfig | undefined;
    qdrant?: QdrantStore | undefined;
  } = {}
): Promise<WikiIndexStatus> {
  const config = options.config ?? getWikiIndexConfig();
  const qdrant = options.qdrant ?? new QdrantHttpStore(config.qdrant);
  const health = await qdrant.health();
  return {
    embedding: {
      provider: config.embedding.provider,
      model: config.embedding.model,
      dimensions: config.embedding.dimensions,
      configured: Boolean(config.embedding.apiKey)
    },
    qdrant: {
      url: config.qdrant.url,
      collection: config.qdrant.collection,
      online: health.online,
      error: health.error
    },
    chunks: repo.listChunks().length,
    pendingJobs: repo.listIndexJobs({ status: "pending" }).length
  };
}

export async function indexWikiPages(
  repo: WikiRepository,
  options: IndexWikiPagesOptions = {}
): Promise<IndexWikiPagesResult> {
  const config = options.config ?? getWikiIndexConfig();
  const embeddingProvider =
    options.embeddingProvider ?? new OpenAIEmbeddingProvider(config.embedding);
  const qdrant = options.qdrant ?? new QdrantHttpStore(config.qdrant);
  const pages = selectPages(repo, options);
  const now = options.now ?? new Date().toISOString();
  const result: IndexWikiPagesResult = {
    collection: config.qdrant.collection,
    indexedPages: 0,
    indexedChunks: 0,
    skippedPages: 0,
    failures: []
  };

  await qdrant.ensureCollection();

  for (const page of pages) {
    const job = repo.createIndexJob({
      pageId: page.id,
      reason: options.reason ?? "manual_rebuild",
      status: "running",
      createdAt: now
    });

    try {
      const chunks = createPageChunks(page, {
        embeddingModel: config.embedding.model,
        embeddingDimensions: config.embedding.dimensions
      });

      if (chunks.length === 0) {
        await qdrant.deletePagePoints(page.id);
        repo.replacePageChunks(page.id, [], { now });
        repo.updateIndexJobStatus(job.id, "done", { finishedAt: new Date().toISOString() });
        finishPendingIndexJobs(repo, page.id, "done");
        result.skippedPages += 1;
        continue;
      }

      const vectors = await embeddingProvider.embed(chunks.map((chunk) => chunk.text));
      if (vectors.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, got ${vectors.length}`
        );
      }

      const storedChunks = repo.replacePageChunks(
        page.id,
        chunks.map((chunk) => chunkToSaveInput(chunk)),
        { now }
      );
      const pointIdsByChunkId = new Map(
        storedChunks.map((chunk) => [chunk.id, chunk.qdrantPointId])
      );
      const points = chunks.map((chunk, index) =>
        chunkToQdrantPoint(
          chunk,
          page,
          vectors[index] ?? [],
          pointIdsByChunkId.get(chunk.id) ?? qdrantPointIdForChunk(chunk)
        )
      );

      await qdrant.deletePagePoints(page.id);
      await qdrant.upsertPoints(points);
      repo.updateIndexJobStatus(job.id, "done", { finishedAt: new Date().toISOString() });
      finishPendingIndexJobs(repo, page.id, "done");
      result.indexedPages += 1;
      result.indexedChunks += chunks.length;
    } catch (error) {
      const message = errorMessage(error);
      repo.updateIndexJobStatus(job.id, "failed", {
        error: message,
        finishedAt: new Date().toISOString()
      });
      finishPendingIndexJobs(repo, page.id, "failed", message);
      result.failures.push({ pageId: page.id, error: message });
    }
  }

  return result;
}

export async function searchWikiSemantic(
  repo: WikiRepository,
  options: WikiSemanticSearchOptions
): Promise<WikiSemanticSearchResult[]> {
  const query = options.query.trim();
  if (!query) return [];

  const config = options.config ?? getWikiIndexConfig();
  const embeddingProvider =
    options.embeddingProvider ?? new OpenAIEmbeddingProvider(config.embedding);
  const qdrant = options.qdrant ?? new QdrantHttpStore(config.qdrant);
  await qdrant.ensureCollection();
  const [vector] = await embeddingProvider.embed([query]);
  if (!vector) return [];

  const hits = await qdrant.search(vector, { limit: options.limit ?? 8 });
  const results: WikiSemanticSearchResult[] = [];
  const seenPageIds = new Set<string>();

  for (const hit of hits) {
    const payload = hit.payload ?? {};
    const pageId = stringPayload(payload, "pageId");
    if (!pageId || seenPageIds.has(pageId)) continue;
    const page = repo.getPage(pageId);
    if (!page) continue;

    const chunkId = stringPayload(payload, "chunkId");
    const chunk = chunkId ? repo.getChunk(chunkId) : null;
    const text = chunk?.text ?? stringPayload(payload, "text") ?? page.body;
    results.push({
      page,
      chunk: chunk ?? undefined,
      score: hit.score,
      snippet: createSnippet(text, query),
      qdrantPointId: String(hit.id)
    });
    seenPageIds.add(pageId);
  }

  return results;
}

export async function queryWikiRag(
  repo: WikiRepository,
  options: WikiRagQueryOptions
): Promise<WikiRagQueryResult> {
  const query = options.query.trim();
  const limit = normalizeLimit(options.limit ?? 5, 20);
  const config = options.config ?? getWikiIndexConfig();
  const graph = repo.getGraph();
  const canUseSemantic = Boolean(options.embeddingProvider || config.embedding.apiKey);

  if (query && canUseSemantic) {
    try {
      const semantic = await searchWikiSemantic(repo, { ...options, limit, config });
      if (semantic.length > 0) {
        return toRagResult({
          query,
          mode: "semantic",
          graph,
          depth: options.depth,
          results: semantic.map((result) => ({
            page: result.page,
            score: result.score,
            snippet: result.snippet,
            reason: "semantic vector match",
            chunkId: result.chunk?.id
          }))
        });
      }
    } catch (error) {
      const fallback = fallbackSearch(repo, query, limit);
      return toRagResult({
        query,
        mode: "fts",
        graph,
        depth: options.depth,
        error: errorMessage(error),
        results: fallback
      });
    }
  }

  return toRagResult({
    query,
    mode: "fts",
    graph,
    depth: options.depth,
    results: fallbackSearch(repo, query, limit)
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

export function qdrantPointIdForChunk(chunk: Pick<WikiChunk, "id" | "contentHash">): string {
  const hex = contentHash(`${chunk.id}:${chunk.contentHash}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}

function chunkToSaveInput(chunk: WikiChunk): SaveChunkInput {
  return {
    id: chunk.id,
    pageId: chunk.pageId,
    contentHash: chunk.contentHash,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    tokenCount: chunk.tokenCount,
    qdrantPointId: qdrantPointIdForChunk(chunk)
  };
}

function chunkToQdrantPoint(
  chunk: WikiChunk,
  page: WikiPage,
  vector: number[],
  pointId: string
): QdrantPoint {
  return {
    id: pointId,
    vector,
    payload: {
      chunkId: chunk.id,
      pageId: page.id,
      pageKind: page.kind,
      title: page.title,
      slug: page.slug,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      updatedAt: page.updatedAt,
      sourceType: page.sourceType ?? null,
      trust: page.trust ?? null
    }
  };
}

function selectPages(repo: WikiRepository, options: IndexWikiPagesOptions): WikiPage[] {
  const limit = options.limit ? normalizeLimit(options.limit, 500) : undefined;
  const pages =
    options.pages ??
    (options.pageIds
      ? options.pageIds.flatMap((pageId) => {
          const page = repo.getPage(pageId);
          return page ? [page] : [];
        })
      : repo.listPages({ limit }));

  return limit ? pages.slice(0, limit) : pages;
}

function fallbackSearch(
  repo: WikiRepository,
  query: string,
  limit: number
): WikiRagQueryResult["results"] {
  const pages = query ? repo.searchPages(query, { limit }) : repo.listPages({ limit });
  return pages.map((page) => ({
    page,
    snippet: createSnippet(`${page.summary ?? ""}\n${page.body}`, query),
    reason: query ? "SQLite full-text match" : "recent page"
  }));
}

function finishPendingIndexJobs(
  repo: WikiRepository,
  pageId: string,
  status: "done" | "failed",
  error?: string | undefined
): void {
  for (const pendingJob of repo.listIndexJobs({ pageId, status: "pending" })) {
    repo.updateIndexJobStatus(pendingJob.id, status, { error });
  }
}

function toRagResult(input: {
  query: string;
  mode: "semantic" | "fts";
  graph: PageGraph;
  depth?: number | undefined;
  results: WikiRagQueryResult["results"];
  error?: string | undefined;
}): WikiRagQueryResult {
  const expandedPageIds = expandPageIds(input.graph, input.results, input.depth ?? 1);
  return {
    query: input.query,
    mode: input.mode,
    markdown: renderRagMarkdown(input.query, input.results, input.graph, expandedPageIds),
    results: input.results,
    expandedPageIds,
    error: input.error
  };
}

function expandPageIds(
  graph: PageGraph,
  results: WikiRagQueryResult["results"],
  depth: number
): string[] {
  const maxDepth = Math.max(0, Math.min(3, Math.floor(depth)));
  const pageIds = new Set(results.map((result) => result.page.id));
  let frontier = [...pageIds];

  for (let currentDepth = 0; currentDepth < maxDepth; currentDepth += 1) {
    const next: string[] = [];
    for (const link of graph.links) {
      if (frontier.includes(link.fromPageId) && !pageIds.has(link.toPageId)) {
        pageIds.add(link.toPageId);
        next.push(link.toPageId);
      }
      if (frontier.includes(link.toPageId) && !pageIds.has(link.fromPageId)) {
        pageIds.add(link.fromPageId);
        next.push(link.fromPageId);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  return [...pageIds];
}

function renderRagMarkdown(
  query: string,
  results: WikiRagQueryResult["results"],
  graph: PageGraph,
  expandedPageIds: string[]
): string {
  const lines = ["# Wiki Context", "", `Query: ${query || "recent pages"}`, ""];
  if (results.length === 0) {
    lines.push("_No matching wiki pages yet._");
    return `${lines.join("\n")}\n`;
  }

  results.forEach((result, index) => {
    lines.push(
      `## ${index + 1}. ${result.page.title}`,
      "",
      `- id: ${result.page.id}`,
      `- kind: ${result.page.kind}`,
      `- reason: ${result.reason}`
    );
    if (result.score !== undefined) lines.push(`- score: ${result.score.toFixed(4)}`);
    if (result.chunkId) lines.push(`- chunk: ${result.chunkId}`);
    lines.push("", "### Matched Text", "", result.snippet || "_No snippet._", "", "### Page", "");
    lines.push(renderPageMarkdown(result.page, graph).trim(), "");
  });

  const related = graph.pages.filter(
    (page) =>
      expandedPageIds.includes(page.id) && !results.some((result) => result.page.id === page.id)
  );
  if (related.length > 0) {
    lines.push("## Related Pages", "");
    for (const page of related) {
      lines.push(`- [[${page.title}]] (${page.kind})`);
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function createSnippet(text: string, query: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lower = trimmed.toLowerCase();
  const firstMatch = words.map((word) => lower.indexOf(word)).find((index) => index >= 0);
  if (firstMatch === undefined) return trimmed.slice(0, 500);
  const start = Math.max(0, firstMatch - 180);
  const end = Math.min(trimmed.length, firstMatch + 320);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < trimmed.length ? "..." : "";
  return `${prefix}${trimmed.slice(start, end)}${suffix}`;
}

function parseQdrantHits(response: QdrantSearchResponse): QdrantSearchHit[] {
  const result = response.result;
  if (Array.isArray(result)) return result.filter(isQdrantHit);
  if (result && typeof result === "object" && "points" in result) {
    const points = (result as { points?: unknown }).points;
    if (Array.isArray(points)) return points.filter(isQdrantHit);
  }
  return [];
}

function isQdrantHit(value: unknown): value is QdrantSearchHit {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    "score" in value &&
    typeof (value as { score: unknown }).score === "number"
  );
}

function stringPayload(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeLimit(value: number, max: number): number {
  if (!Number.isFinite(value)) return Math.min(10, max);
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
