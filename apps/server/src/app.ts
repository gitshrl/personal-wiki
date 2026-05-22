import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  getPersonalWikiRuntimePaths,
  ensurePersonalWikiRuntimeHome,
  normalizePageKind,
  renderPageMarkdown,
  type PersonalWikiRuntimePaths,
  type WikiPage
} from "@personal-wiki/wiki-core";
import { buildAddNoteProposal, noteInputToPage } from "@personal-wiki/wiki-agent";
import {
  createWikiRepository,
  openWikiDatabase,
  resolveGraphFocusNode,
  resolvePageReference,
  type WikiRepository
} from "@personal-wiki/wiki-db";
import {
  getWikiIndexConfig,
  getWikiIndexStatus,
  indexWikiPages,
  queryWikiRag,
  type EmbeddingProvider,
  type QdrantStore,
  type WikiIndexConfig
} from "@personal-wiki/wiki-index";

export interface CreateServerAppOptions {
  repo?: WikiRepository;
  runtimePaths?: PersonalWikiRuntimePaths;
  indexConfig?: WikiIndexConfig | undefined;
  embeddingProvider?: EmbeddingProvider | undefined;
  qdrant?: QdrantStore | undefined;
}

const pageKindSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => normalizePageKind(value));
const pageStatusSchema = z.enum(["active", "archived", "draft"]);
const proposalStatusValueSchema = z.enum(["pending", "accepted", "rejected", "applied"]);
const writeModeSchema = z.enum(["propose", "direct"]);

const pageListQuerySchema = z.object({
  kind: pageKindSchema.optional(),
  status: pageStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const createPageSchema = z.object({
  kind: pageKindSchema,
  title: z.string().trim().min(1),
  body: z.string().optional(),
  summary: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().optional(),
  trust: z.string().optional(),
  createdByAgentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const updatePageSchema = z
  .object({
    kind: pageKindSchema.optional(),
    title: z.string().trim().min(1).optional(),
    body: z.string().optional(),
    summary: z.string().nullable().optional(),
    status: pageStatusSchema.optional(),
    sourceUrl: z.string().url().nullable().optional(),
    sourceType: z.string().nullable().optional(),
    trust: z.string().nullable().optional(),
    createdByAgentId: z.string().nullable().optional(),
    archivedAt: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .strict();

const noteSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  kind: pageKindSchema.optional(),
  summary: z.string().trim().max(96).optional(),
  agentId: z.string().trim().min(1),
  sourceSessionId: z.string().optional(),
  sourceSessionLabel: z.string().trim().optional(),
  targetPages: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  mode: writeModeSchema.optional()
});

const linkSchema = z.object({
  fromPageId: z.string().trim().min(1),
  toPageId: z.string().trim().min(1),
  sourceText: z.string().optional(),
  createdByAgentId: z.string().optional()
});

const proposalListQuerySchema = z.object({
  status: proposalStatusValueSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const proposalStatusSchema = z.object({
  status: proposalStatusValueSchema
});

const indexRebuildSchema = z.object({
  pageIds: z.array(z.string().trim().min(1)).optional(),
  limit: z.number().int().min(1).max(500).optional()
});

const ragQuerySchema = z.object({
  query: z.string().trim().default(""),
  limit: z.number().int().min(1).max(20).optional(),
  depth: z.number().int().min(0).max(3).optional()
});

export function createServerApp(options: CreateServerAppOptions = {}) {
  const runtimePaths =
    options.runtimePaths ??
    (options.repo ? getPersonalWikiRuntimePaths() : ensurePersonalWikiRuntimeHome());
  const repo =
    options.repo ??
    createWikiRepository(openWikiDatabase({ path: runtimePaths.databasePath, migrate: true }));
  repo.rebuildDerivedGraph();
  const getIndexConfig = () => options.indexConfig ?? getWikiIndexConfig();
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowHeaders: ["content-type"]
    })
  );

  app.onError((error, c) => {
    const status = error instanceof ApiError ? error.status : 500;
    return c.json({ error: error.message || "Internal server error" }, status);
  });

  app.get("/health", (c) =>
    c.json({
      ok: true,
      runtime: {
        homeDir: runtimePaths.homeDir,
        databasePath: runtimePaths.databasePath,
        resourcesDir: runtimePaths.resourcesDir
      }
    })
  );

  app.get("/api/runtime", (c) => {
    const indexConfig = getIndexConfig();
    return c.json({
      runtime: runtimePaths,
      embedding: publicEmbeddingConfig(indexConfig),
      qdrant: publicQdrantConfig(indexConfig)
    });
  });

  app.get("/api/pages", (c) => {
    const query = parseSchema(pageListQuerySchema, c.req.query());
    return c.json({
      pages: repo.listPages({
        kind: query.kind,
        status: query.status,
        limit: query.limit,
        offset: query.offset
      })
    });
  });

  app.post("/api/pages", async (c) => {
    const input = parseSchema(createPageSchema, await readJson(c.req));
    const page = repo.createPage(input, {
      changedBy: input.createdByAgentId ?? "local-api",
      changeReason: "api create page"
    });
    return c.json({ page }, 201);
  });

  app.get("/api/pages/:id", (c) => {
    const page = getPageByReference(repo, c.req.param("id"));
    const format = c.req.query("format");

    if (format === "markdown") {
      return c.body(renderPageMarkdown(page, repo.getGraph()), 200, {
        "Content-Type": "text/markdown; charset=utf-8"
      });
    }

    return c.json({
      page,
      backlinks: repo.getBacklinks(page.id),
      outgoing: repo.getOutgoing(page.id)
    });
  });

  app.get("/api/pages/:id/markdown", (c) => {
    const page = getPageByReference(repo, c.req.param("id"));
    return c.body(renderPageMarkdown(page, repo.getGraph()), 200, {
      "Content-Type": "text/markdown; charset=utf-8"
    });
  });

  app.patch("/api/pages/:id", async (c) => {
    const page = getPageByReference(repo, c.req.param("id"));
    const input = parseSchema(updatePageSchema, await readJson(c.req));
    const updated = repo.updatePage(page.id, input, {
      changedBy: "local-api",
      changeReason: "api update page"
    });
    return c.json({ page: updated });
  });

  app.get("/api/pages/:id/backlinks", (c) => {
    const page = getPageByReference(repo, c.req.param("id"));
    return c.json({ page, backlinks: repo.getBacklinks(page.id) });
  });

  app.get("/api/pages/:id/outgoing", (c) => {
    const page = getPageByReference(repo, c.req.param("id"));
    return c.json({ page, outgoing: repo.getOutgoing(page.id) });
  });

  app.get("/api/search", (c) => {
    const q = c.req.query("q")?.trim() ?? "";
    const limit = parseLimit(c.req.query("limit"), 20, 50);
    return c.json({
      query: q,
      pages: q ? repo.searchPages(q, { limit }) : repo.listPages({ limit })
    });
  });

  app.get("/api/index/status", async (c) => {
    const indexConfig = getIndexConfig();
    const status = await getWikiIndexStatus(repo, {
      config: indexConfig,
      qdrant: options.qdrant
    });
    return c.json({ status });
  });

  app.post("/api/index/rebuild", async (c) => {
    const input = parseSchema(indexRebuildSchema, await readJson(c.req));
    const indexConfig = getIndexConfig();
    if (!indexConfig.embedding.apiKey && !options.embeddingProvider) {
      throw new ApiError(
        400,
        "OpenAI API key is required. Add it to ~/.personal-wiki/config.json."
      );
    }
    const missingPageIds = findMissingPageIds(repo, input.pageIds ?? []);
    if (missingPageIds.length > 0) {
      throw new ApiError(404, `Page not found for indexing: ${missingPageIds.join(", ")}`);
    }

    const result = await indexWikiPages(repo, {
      pageIds: input.pageIds,
      limit: input.limit,
      reason: "api_rebuild",
      config: indexConfig,
      embeddingProvider: options.embeddingProvider,
      qdrant: options.qdrant
    });
    return c.json({ result });
  });

  app.post("/api/rag", async (c) => {
    const input = parseSchema(ragQuerySchema, await readJson(c.req));
    const indexConfig = getIndexConfig();
    const result = await queryWikiRag(repo, {
      query: input.query ?? "",
      limit: input.limit,
      depth: input.depth,
      config: indexConfig,
      embeddingProvider: options.embeddingProvider,
      qdrant: options.qdrant
    });
    return c.json(result);
  });

  app.get("/api/graph", (c) => {
    const depth = parseLimit(c.req.query("depth"), 1, 4);
    const limit = parseLimit(c.req.query("limit"), 100, 500);
    const graph = repo.getKnowledgeGraph();
    let node;
    try {
      node = resolveGraphFocusNode(repo, graph, {
        focusNodeId: c.req.query("focusNodeId"),
        focusPageId: c.req.query("focusPageId"),
        focusEntityId: c.req.query("focusEntityId"),
        focusId: c.req.query("focus") ?? c.req.query("focusId")
      });
    } catch (error) {
      throw toGraphReferenceApiError(error);
    }

    if (!node) {
      return c.json(graph);
    }

    const neighborhood = repo.getKnowledgeGraphNeighborhood(node.id, { depth, limit });
    if (!neighborhood) throw new ApiError(404, "Graph focus not found");
    return c.json(neighborhood);
  });

  app.get("/api/page-graph", (c) => c.json(repo.getGraph()));

  app.post("/api/links", async (c) => {
    const input = parseSchema(linkSchema, await readJson(c.req));
    const fromPage = getPageByReference(repo, input.fromPageId);
    const toPage = getPageByReference(repo, input.toPageId);
    const link = repo.addLink({
      fromPageId: fromPage.id,
      toPageId: toPage.id,
      origin: "manual",
      sourceText: input.sourceText,
      createdByAgentId: input.createdByAgentId
    });
    return c.json({ link }, 201);
  });

  app.get("/api/proposals", (c) => {
    const query = parseSchema(proposalListQuerySchema, c.req.query());
    return c.json({ proposals: repo.listProposals({ status: query.status, limit: query.limit }) });
  });

  app.post("/api/proposals/:id/status", async (c) => {
    const input = parseSchema(proposalStatusSchema, await readJson(c.req));
    const proposal = repo.updateProposalStatus(c.req.param("id"), input.status);
    return c.json({ proposal });
  });

  app.post("/api/notes", async (c) => {
    const input = parseSchema(noteSchema, await readJson(c.req));
    const mode = input.mode ?? "propose";

    if (mode === "direct") {
      const page = repo.savePage(noteInputToPage(input), {
        changedBy: input.agentId,
        changeReason: "agent add note"
      });
      const linkedPageIds = addTargetPageLinks(repo, page, input.targetPages ?? [], input.agentId);
      return c.json({ mode, page: repo.getPage(page.id) ?? page, linkedPageIds }, 201);
    }

    const payload = buildAddNoteProposal(input);
    const proposal = repo.createProposal({
      title: `Add note: ${input.title}`,
      proposedByAgentId: input.agentId,
      payload
    });
    return c.json({ mode, proposal }, 201);
  });

  return app;
}

class ApiError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
  }
}

async function readJson(req: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

function parseSchema<T>(schema: z.Schema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

function getPageByReference(repo: WikiRepository, reference: string): WikiPage {
  const page = resolvePageReference(repo, reference);

  if (!page) {
    throw new ApiError(404, `Page not found: ${reference}`);
  }

  return page;
}

function addTargetPageLinks(
  repo: WikiRepository,
  page: WikiPage,
  targetPages: string[],
  agentId: string
): string[] {
  const linkedPageIds: string[] = [];

  for (const targetPage of targetPages) {
    const target = getOptionalPageByReference(repo, targetPage);
    if (!target || target.id === page.id) continue;
    repo.addLink({
      fromPageId: page.id,
      toPageId: target.id,
      origin: "manual",
      createdByAgentId: agentId
    });
    linkedPageIds.push(target.id);
  }

  return linkedPageIds;
}

function getOptionalPageByReference(repo: WikiRepository, reference: string): WikiPage | null {
  try {
    return getPageByReference(repo, reference);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function parseLimit(value: string | undefined, fallback: number, max = 500): number {
  if (!value) return fallback;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(numberValue)));
}

function findMissingPageIds(repo: WikiRepository, pageIds: string[]): string[] {
  return pageIds.filter((pageId) => !repo.getPage(pageId));
}

function toGraphReferenceApiError(error: unknown): Error {
  if (error instanceof Error && isGraphReferenceError(error)) {
    return new ApiError(404, error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function isGraphReferenceError(error: Error): boolean {
  return (
    error.message.startsWith("Page not found:") ||
    error.message.startsWith("Graph node not found:") ||
    error.message.startsWith("Graph page node not found:") ||
    error.message.startsWith("Graph entity node not found:")
  );
}

function publicEmbeddingConfig(config: WikiIndexConfig) {
  return {
    provider: config.embedding.provider,
    model: config.embedding.model,
    dimensions: config.embedding.dimensions,
    configured: Boolean(config.embedding.apiKey)
  };
}

function publicQdrantConfig(config: WikiIndexConfig) {
  return {
    url: config.qdrant.url,
    collection: config.qdrant.collection,
    vectorSize: config.qdrant.vectorSize,
    distance: config.qdrant.distance
  };
}
