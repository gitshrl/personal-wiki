import {
  normalizeTitle,
  renderPageMarkdown,
  slugify,
  type PageGraph,
  type WikiPage
} from "@personal-wiki/wiki-core";
import {
  buildAddNoteProposal,
  noteInputToPage,
  type AddNoteInput
} from "@personal-wiki/wiki-agent";
import type { WikiProposal, WikiRepository } from "@personal-wiki/wiki-db";
import {
  getWikiIndexConfig,
  indexWikiPages,
  queryWikiRag as runWikiRagQuery,
  type EmbeddingProvider,
  type QdrantStore,
  type WikiIndexConfig,
  type WikiRagQueryResult
} from "@personal-wiki/wiki-index";

export interface WikiToolContext {
  repo: WikiRepository;
  indexConfig?: WikiIndexConfig | undefined;
  embeddingProvider?: EmbeddingProvider | undefined;
  qdrant?: QdrantStore | undefined;
}

export interface WikiSearchInput {
  q: string;
  limit?: number | undefined;
}

export interface WikiGetPageInput {
  id: string;
  format?: "markdown" | "json" | undefined;
}

export interface WikiGraphQueryInput {
  focusPageId?: string | undefined;
  depth?: number | undefined;
  limit?: number | undefined;
}

export interface WikiRagQueryInput {
  query: string;
  limit?: number | undefined;
  depth?: number | undefined;
  format?: "markdown" | "json" | undefined;
}

export interface WikiRebuildIndexInput {
  pageIds?: string[] | undefined;
  limit?: number | undefined;
}

export interface WikiAppendPageInput {
  pageId: string;
  body: string;
  agentId: string;
  mode?: "propose" | "direct" | undefined;
}

export interface WikiLinkPagesInput {
  fromPageId: string;
  toPageId: string;
  agentId: string;
  sourceText?: string | undefined;
  mode?: "propose" | "direct" | undefined;
}

export interface WikiAddNoteResult {
  mode: "propose" | "direct";
  page?: WikiPage | undefined;
  proposal?: WikiProposal | undefined;
  linkedPageIds?: string[] | undefined;
}

export function searchWiki(context: WikiToolContext, input: WikiSearchInput) {
  const query = input.q.trim();
  const limit = normalizeLimit(input.limit ?? 10, 50);
  const pages = query
    ? context.repo.searchPages(query, { limit })
    : context.repo.listPages({ limit });

  return {
    query,
    pages: pages.map(summarizePage)
  };
}

export function getWikiPage(context: WikiToolContext, input: WikiGetPageInput) {
  const page = getPageByReference(context.repo, input.id);
  const format = input.format ?? "markdown";

  if (format === "markdown") {
    return {
      format,
      page: summarizePage(page),
      markdown: renderPageMarkdown(page, context.repo.getGraph())
    };
  }

  return {
    format,
    page,
    backlinks: context.repo.getBacklinks(page.id),
    outgoing: context.repo.getOutgoing(page.id)
  };
}

export function addWikiNote(context: WikiToolContext, input: AddNoteInput): WikiAddNoteResult {
  const mode = input.mode ?? "propose";

  if (mode === "direct") {
    const page = context.repo.savePage(noteInputToPage(input), {
      changedBy: input.agentId,
      changeReason: "mcp add note"
    });
    const linkedPageIds = addTargetPageLinks(
      context.repo,
      page,
      input.targetPages ?? [],
      input.agentId
    );
    return { mode, page: context.repo.getPage(page.id) ?? page, linkedPageIds };
  }

  const payload = buildAddNoteProposal(input);
  const proposal = context.repo.createProposal({
    title: `Add note: ${input.title}`,
    proposedByAgentId: input.agentId,
    payload
  });

  return { mode, proposal };
}

export function appendWikiPage(context: WikiToolContext, input: WikiAppendPageInput) {
  const page = getPageByReference(context.repo, input.pageId);
  const body = input.body.trim();
  const agentId = input.agentId.trim();
  if (!body) throw new Error("body is required");
  if (!agentId) throw new Error("agentId is required");

  if ((input.mode ?? "propose") === "direct") {
    const updated = context.repo.updatePage(
      page.id,
      { body: appendBody(page.body, body) },
      { changedBy: agentId, changeReason: "mcp append page" }
    );
    return { mode: "direct" as const, page: updated };
  }

  const proposal = context.repo.createProposal({
    title: `Append page: ${page.title}`,
    proposedByAgentId: agentId,
    payload: {
      title: page.title,
      proposedByAgentId: agentId,
      changes: [
        {
          op: "append_page",
          pageId: page.id,
          body
        }
      ]
    }
  });
  return { mode: "propose" as const, proposal };
}

export function linkWikiPages(context: WikiToolContext, input: WikiLinkPagesInput) {
  const fromPage = getPageByReference(context.repo, input.fromPageId);
  const toPage = getPageByReference(context.repo, input.toPageId);
  const agentId = input.agentId.trim();
  if (!agentId) throw new Error("agentId is required");

  if ((input.mode ?? "propose") === "direct") {
    const link = context.repo.addLink({
      fromPageId: fromPage.id,
      toPageId: toPage.id,
      origin: "manual",
      sourceText: input.sourceText,
      createdByAgentId: agentId
    });
    return { mode: "direct" as const, link };
  }

  const proposal = context.repo.createProposal({
    title: `Link pages: ${fromPage.title} -> ${toPage.title}`,
    proposedByAgentId: agentId,
    payload: {
      title: `Link pages: ${fromPage.title} -> ${toPage.title}`,
      proposedByAgentId: agentId,
      changes: [
        {
          op: "add_link",
          pageId: fromPage.id,
          targetPages: [toPage.id]
        }
      ]
    }
  });
  return { mode: "propose" as const, proposal };
}

export function queryWikiGraph(context: WikiToolContext, input: WikiGraphQueryInput): PageGraph {
  if (!input.focusPageId) {
    return context.repo.getGraph();
  }

  const page = getPageByReference(context.repo, input.focusPageId);
  const neighborhood = context.repo.getPageNeighborhood(page.id, {
    depth: normalizeLimit(input.depth ?? 1, 4),
    limit: normalizeLimit(input.limit ?? 100, 500)
  });

  if (!neighborhood) {
    throw new Error(`Graph focus not found: ${input.focusPageId}`);
  }

  return {
    pages: neighborhood.pages,
    links: neighborhood.links
  };
}

export async function queryWikiRag(
  context: WikiToolContext,
  input: WikiRagQueryInput
): Promise<WikiRagQueryResult> {
  return runWikiRagQuery(context.repo, {
    query: input.query,
    limit: normalizeLimit(input.limit ?? 5, 20),
    depth: input.depth === undefined ? 1 : normalizeDepth(input.depth),
    config: getContextIndexConfig(context),
    embeddingProvider: context.embeddingProvider,
    qdrant: context.qdrant
  });
}

export async function rebuildWikiIndex(
  context: WikiToolContext,
  input: WikiRebuildIndexInput = {}
) {
  const config = getContextIndexConfig(context);
  if (!config.embedding.apiKey && !context.embeddingProvider) {
    throw new Error("OpenAI API key is required in ~/.personal-wiki/config.json");
  }

  return indexWikiPages(context.repo, {
    pageIds: input.pageIds,
    limit: input.limit,
    reason: "mcp_rebuild",
    config,
    embeddingProvider: context.embeddingProvider,
    qdrant: context.qdrant
  });
}

export function listRecentWikiPages(context: WikiToolContext, limit = 20) {
  return context.repo.listPages({ limit: normalizeLimit(limit, 100) }).map(summarizePage);
}

export function getPageByReference(repo: WikiRepository, reference: string): WikiPage {
  const value = decodeURIComponent(reference).trim();
  const page =
    repo.getPage(value) ??
    repo.getPageBySlug(slugify(value)) ??
    repo.listPages().find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(value));

  if (!page) {
    throw new Error(`Page not found: ${reference}`);
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
    if (error instanceof Error && error.message.startsWith("Page not found:")) return null;
    throw error;
  }
}

function summarizePage(page: WikiPage) {
  return {
    id: page.id,
    kind: page.kind,
    title: page.title,
    slug: page.slug,
    summary: page.summary,
    status: page.status,
    updatedAt: page.updatedAt
  };
}

function appendBody(current: string, next: string): string {
  const trimmedCurrent = current.trim();
  if (!trimmedCurrent) return next;
  return `${trimmedCurrent}\n\n${next}`;
}

function normalizeLimit(value: number, max: number): number {
  if (!Number.isFinite(value)) return Math.min(20, max);
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function normalizeDepth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(3, Math.floor(value)));
}

function getContextIndexConfig(context: WikiToolContext): WikiIndexConfig {
  return context.indexConfig ?? getWikiIndexConfig();
}
