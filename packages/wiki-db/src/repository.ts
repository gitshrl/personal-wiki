import {
  assertPageKind,
  buildPageResolver,
  createAliasId,
  createEntityId,
  createEntityLinkId,
  createEntityMentionId,
  createGraphEdgeId,
  createGraphNodeId,
  createLinkId,
  createPage as createCorePage,
  normalizeEntityKind,
  normalizeTitle,
  normalizePageKind,
  parseWikilinks,
  replaceWikilinkLinks,
  shortHash,
  slugify
} from "@personal-wiki/wiki-core";
import type {
  CreatePageInput,
  EntityGraph,
  EntityLink,
  EntityLinkOrigin,
  EntityMention,
  EntityNeighborhood,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  KnowledgeGraphNeighborhood,
  LinkOrigin,
  PageAlias,
  PageGraph,
  PageKind,
  PageNeighborhood,
  PageStatus,
  PageWithLinks,
  WikiEntity,
  WikiLink,
  WikiPage
} from "@personal-wiki/wiki-core";
import type { WikiDatabase } from "./database";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "applied";
export type IndexJobStatus = "pending" | "running" | "done" | "failed";

export interface WikiProposal {
  id: string;
  title: string;
  status: ProposalStatus;
  proposedByAgentId: string;
  sourceCaptureId?: string | undefined;
  createdAt: string;
  appliedAt?: string | undefined;
  payload: unknown;
}

export interface CreateProposalInput {
  id?: string | undefined;
  title: string;
  proposedByAgentId: string;
  sourceCaptureId?: string | undefined;
  payload: unknown;
  status?: ProposalStatus | undefined;
  createdAt?: string | undefined;
}

export interface PageRevision {
  id: string;
  pageId: string;
  body: string;
  title: string;
  changedBy: string;
  changeReason?: string | undefined;
  createdAt: string;
}

export interface CreatePageRevisionInput {
  id?: string | undefined;
  pageId: string;
  body: string;
  title: string;
  changedBy: string;
  changeReason?: string | undefined;
  createdAt?: string | undefined;
}

export interface WikiStoredChunk {
  id: string;
  pageId: string;
  contentHash: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number | undefined;
  qdrantPointId?: string | undefined;
  updatedAt: string;
}

export interface SaveChunkInput {
  id: string;
  pageId: string;
  contentHash: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number | undefined;
  qdrantPointId?: string | undefined;
}

export interface WikiIndexJob {
  id: string;
  pageId: string;
  reason: string;
  status: IndexJobStatus;
  error?: string | undefined;
  createdAt: string;
  finishedAt?: string | undefined;
}

export interface CreateIndexJobInput {
  id?: string | undefined;
  pageId: string;
  reason: string;
  status?: IndexJobStatus | undefined;
  error?: string | undefined;
  createdAt?: string | undefined;
  finishedAt?: string | undefined;
}

export interface SavePageOptions {
  now?: string | undefined;
  changedBy?: string | undefined;
  changeReason?: string | undefined;
  createRevision?: boolean | undefined;
  updateWikilinks?: boolean | undefined;
}

export interface UpdatePageInput {
  kind?: PageKind | undefined;
  title?: string | undefined;
  body?: string | undefined;
  summary?: string | null | undefined;
  status?: PageStatus | undefined;
  sourceUrl?: string | null | undefined;
  sourceType?: string | null | undefined;
  trust?: string | null | undefined;
  createdByAgentId?: string | null | undefined;
  archivedAt?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface CreateAliasInput {
  id?: string | undefined;
  pageId: string;
  alias: string;
}

export interface CreateLinkInput {
  id?: string | undefined;
  fromPageId: string;
  toPageId: string;
  origin: LinkOrigin;
  sourceText?: string | undefined;
  createdByAgentId?: string | undefined;
  createdAt?: string | undefined;
}

export interface ListPagesOptions {
  kind?: PageKind | undefined;
  status?: PageStatus | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ListLinksOptions {
  fromPageId?: string | undefined;
  toPageId?: string | undefined;
  origin?: LinkOrigin | undefined;
}

export interface GraphNeighborhoodOptions {
  depth?: number | undefined;
  kinds?: PageKind[] | undefined;
  limit?: number | undefined;
}

export interface EntityGraphNeighborhoodOptions {
  depth?: number | undefined;
  kinds?: string[] | undefined;
  limit?: number | undefined;
}

export interface KnowledgeGraphNeighborhoodOptions {
  depth?: number | undefined;
  nodeKinds?: string[] | undefined;
  limit?: number | undefined;
}

export interface GraphFocusReference {
  focusNodeId?: string | undefined;
  focusPageId?: string | undefined;
  focusEntityId?: string | undefined;
  focusId?: string | undefined;
}

export interface FindPathsOptions {
  maxDepth?: number | undefined;
  limit?: number | undefined;
}

export interface ListChunksOptions {
  pageId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ListIndexJobsOptions {
  pageId?: string | undefined;
  status?: IndexJobStatus | undefined;
  limit?: number | undefined;
}

export interface MissingWikilink {
  pageId: string;
  pageTitle: string;
  target: string;
  sourceText: string;
  index: number;
}

export interface DuplicateCandidate {
  normalizedTitle: string;
  pages: WikiPage[];
  aliases: PageAlias[];
}

interface PageRow {
  id: string;
  kind: string;
  title: string;
  slug: string;
  body: string;
  summary: string | null;
  status: string;
  source_url: string | null;
  source_type: string | null;
  trust: string | null;
  created_by_agent_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  metadata_json: string;
}

interface AliasRow {
  id: string;
  page_id: string;
  alias: string;
  normalized_alias: string;
}

interface LinkRow {
  id: string;
  from_page_id: string;
  to_page_id: string;
  origin: string;
  source_text: string | null;
  created_by_agent_id: string | null;
  created_at: string;
}

interface EntityRow {
  id: string;
  kind: string;
  title: string;
  slug: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  metadata_json: string;
}

interface EntityMentionRow {
  id: string;
  page_id: string;
  entity_id: string;
  source_text: string;
  created_at: string;
}

interface EntityLinkRow {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  origin: string;
  source_page_id: string | null;
  created_at: string;
}

interface ProposalRow {
  id: string;
  title: string;
  status: string;
  proposed_by_agent_id: string;
  source_capture_id: string | null;
  created_at: string;
  applied_at: string | null;
  payload_json: string;
}

interface RevisionRow {
  id: string;
  page_id: string;
  body: string;
  title: string;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

interface ChunkRow {
  id: string;
  page_id: string;
  content_hash: string;
  chunk_index: number;
  text: string;
  token_count: number | null;
  qdrant_point_id: string | null;
  updated_at: string;
}

interface IndexJobRow {
  id: string;
  page_id: string;
  reason: string;
  status: string;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

interface IdRow {
  id: string;
}

const pageStatuses = new Set<string>(["active", "archived", "draft"]);
const linkOrigins = new Set<string>(["wikilink", "manual", "proposal", "system"]);
const entityLinkOrigins = new Set<string>(["co-mention", "manual", "page-title", "system"]);
const proposalStatuses = new Set<string>(["pending", "accepted", "rejected", "applied"]);
const indexJobStatuses = new Set<string>(["pending", "running", "done", "failed"]);

export class WikiRepository {
  constructor(private readonly db: WikiDatabase) {}

  createPage(input: CreatePageInput, options: SavePageOptions = {}): WikiPage {
    const now = options.now ?? new Date().toISOString();
    const page = createCorePage(input, now);
    return this.savePage(page, {
      ...options,
      now,
      changedBy: options.changedBy ?? input.createdByAgentId ?? "system",
      changeReason: options.changeReason ?? "create page"
    });
  }

  savePage(page: WikiPage, options: SavePageOptions = {}): WikiPage {
    const now = options.now ?? new Date().toISOString();
    const normalizedPage = normalizePageForSave(page);
    const existing = this.getPage(normalizedPage.id);
    const shouldCreateRevision =
      options.createRevision ??
      (!existing ||
        existing.title !== normalizedPage.title ||
        existing.body !== normalizedPage.body);
    const shouldCreateIndexJob =
      !existing ||
      existing.kind !== normalizedPage.kind ||
      existing.title !== normalizedPage.title ||
      existing.body !== normalizedPage.body ||
      existing.summary !== normalizedPage.summary ||
      existing.sourceType !== normalizedPage.sourceType ||
      existing.trust !== normalizedPage.trust;

    const save = this.db.transaction(() => {
      this.upsertPageRow(normalizedPage);

      if (existing && normalizeTitle(existing.title) !== normalizeTitle(normalizedPage.title)) {
        this.upsertAliasRow(createAlias(existing.id, existing.title));
      }

      if (shouldCreateRevision) {
        this.insertRevisionRow(
          createRevision({
            pageId: normalizedPage.id,
            title: normalizedPage.title,
            body: normalizedPage.body,
            changedBy: options.changedBy ?? normalizedPage.createdByAgentId ?? "system",
            changeReason: options.changeReason,
            createdAt: now
          })
        );
      }

      if (shouldCreateIndexJob) {
        this.insertIndexJobRow(
          createIndexJob({
            pageId: normalizedPage.id,
            reason: existing ? "page_updated" : "page_created",
            createdAt: now
          })
        );
      }

      if (options.updateWikilinks ?? true) {
        this.replaceWikilinksForPage(normalizedPage, now);
        this.replaceEntityMentionsForPage(normalizedPage, now);
      }
    });

    save();
    return this.getRequiredPage(normalizedPage.id);
  }

  updatePage(id: string, input: UpdatePageInput, options: SavePageOptions = {}): WikiPage {
    const existing = this.getRequiredPage(id);
    const now = options.now ?? new Date().toISOString();
    const title = input.title === undefined ? existing.title : input.title.trim();

    if (!title) {
      throw new Error("Page title is required");
    }

    const status = input.status ?? existing.status;
    const nextPage: WikiPage = {
      ...existing,
      kind: input.kind ?? existing.kind,
      title,
      slug: title === existing.title ? existing.slug : slugify(title),
      body: input.body ?? existing.body,
      summary: optionalPatch(input.summary, existing.summary),
      status,
      sourceUrl: optionalPatch(input.sourceUrl, existing.sourceUrl),
      sourceType: optionalPatch(input.sourceType, existing.sourceType),
      trust: optionalPatch(input.trust, existing.trust),
      createdByAgentId: optionalPatch(input.createdByAgentId, existing.createdByAgentId),
      updatedAt: now,
      archivedAt:
        input.archivedAt === undefined
          ? status === "archived" && existing.status !== "archived"
            ? now
            : existing.archivedAt
          : (input.archivedAt ?? undefined),
      metadata: input.metadata ?? existing.metadata
    };

    return this.savePage(nextPage, { ...options, now });
  }

  getPage(id: string): WikiPage | null {
    const row = this.db.prepare("SELECT * FROM pages WHERE id = ?").get(id) as PageRow | undefined;
    return row ? rowToPage(row) : null;
  }

  getPageBySlug(slug: string): WikiPage | null {
    const row = this.db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug) as
      | PageRow
      | undefined;
    return row ? rowToPage(row) : null;
  }

  listPages(options: ListPagesOptions = {}): WikiPage[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.kind) {
      conditions.push("kind = @kind");
      params.kind = normalizePageKind(options.kind);
    }

    if (options.status) {
      conditions.push("status = @status");
      params.status = options.status;
    }

    let sql = "SELECT * FROM pages";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY updated_at DESC, title ASC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    } else if (options.offset !== undefined) {
      sql += " LIMIT -1";
    }

    if (options.offset !== undefined) {
      sql += " OFFSET @offset";
      params.offset = Math.max(0, Math.floor(options.offset));
    }

    return (this.db.prepare(sql).all(params) as PageRow[]).map(rowToPage);
  }

  searchPages(query: string, options: { limit?: number | undefined } = {}): WikiPage[] {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) return [];

    const rows = this.db
      .prepare(
        `
          SELECT p.*
          FROM pages_fts
          JOIN pages p ON p.rowid = pages_fts.rowid
          WHERE pages_fts MATCH @query
          ORDER BY bm25(pages_fts), p.updated_at DESC
          LIMIT @limit
        `
      )
      .all({ query: ftsQuery, limit: normalizeLimit(options.limit ?? 20) }) as PageRow[];

    return rows.map(rowToPage);
  }

  addAlias(input: CreateAliasInput): PageAlias {
    const alias = createAlias(input.pageId, input.alias, input.id);
    const existing = this.getAliasByNormalized(alias.normalizedAlias);

    if (existing) {
      if (existing.pageId !== alias.pageId) {
        throw new Error(`Alias already belongs to page: ${existing.pageId}`);
      }
      return existing;
    }

    this.upsertAliasRow(alias);
    return alias;
  }

  getAlias(id: string): PageAlias | null {
    const row = this.db.prepare("SELECT * FROM page_aliases WHERE id = ?").get(id) as
      | AliasRow
      | undefined;
    return row ? rowToAlias(row) : null;
  }

  getAliasByNormalized(normalizedAlias: string): PageAlias | null {
    const row = this.db
      .prepare("SELECT * FROM page_aliases WHERE normalized_alias = ?")
      .get(normalizeTitle(normalizedAlias)) as AliasRow | undefined;
    return row ? rowToAlias(row) : null;
  }

  listAliases(pageId?: string): PageAlias[] {
    const rows =
      pageId === undefined
        ? (this.db.prepare("SELECT * FROM page_aliases ORDER BY alias ASC").all() as AliasRow[])
        : (this.db
            .prepare("SELECT * FROM page_aliases WHERE page_id = ? ORDER BY alias ASC")
            .all(pageId) as AliasRow[]);

    return rows.map(rowToAlias);
  }

  removeAlias(id: string): void {
    this.db.prepare("DELETE FROM page_aliases WHERE id = ?").run(id);
  }

  addLink(input: CreateLinkInput): WikiLink {
    const now = input.createdAt ?? new Date().toISOString();
    const link: WikiLink = {
      id:
        input.id ??
        createLinkId(input.fromPageId, input.toPageId, input.sourceText ?? input.origin),
      fromPageId: input.fromPageId,
      toPageId: input.toPageId,
      origin: input.origin,
      sourceText: input.sourceText,
      createdByAgentId: input.createdByAgentId,
      createdAt: now
    };

    this.upsertLinkRow(link);
    if (link.origin === "manual") {
      this.syncManualEntityLink(link, now);
    }
    return link;
  }

  getLink(id: string): WikiLink | null {
    const row = this.db.prepare("SELECT * FROM links WHERE id = ?").get(id) as LinkRow | undefined;
    return row ? rowToLink(row) : null;
  }

  listLinks(options: ListLinksOptions = {}): WikiLink[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.fromPageId) {
      conditions.push("from_page_id = @fromPageId");
      params.fromPageId = options.fromPageId;
    }

    if (options.toPageId) {
      conditions.push("to_page_id = @toPageId");
      params.toPageId = options.toPageId;
    }

    if (options.origin) {
      conditions.push("origin = @origin");
      params.origin = options.origin;
    }

    let sql = "SELECT * FROM links";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at ASC, id ASC";

    return (this.db.prepare(sql).all(params) as LinkRow[]).map(rowToLink);
  }

  removeLink(id: string): void {
    const link = this.getLink(id);
    this.db.prepare("DELETE FROM links WHERE id = ?").run(id);
    if (link?.origin === "manual") {
      const page = this.getPage(link.fromPageId);
      if (page) {
        this.replaceEntityMentionsForPage(page, new Date().toISOString());
      }
    }
  }

  getEntity(id: string): WikiEntity | null {
    const row = this.db.prepare("SELECT * FROM entities WHERE id = ?").get(id) as
      | EntityRow
      | undefined;
    return row ? rowToEntity(row) : null;
  }

  getEntityByKindSlug(kind: string, slug: string): WikiEntity | null {
    const row = this.db
      .prepare("SELECT * FROM entities WHERE kind = ? AND slug = ?")
      .get(normalizeEntityKind(kind), slugify(slug)) as EntityRow | undefined;
    return row ? rowToEntity(row) : null;
  }

  listEntities(
    options: { kind?: string | undefined; limit?: number | undefined } = {}
  ): WikiEntity[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.kind) {
      conditions.push("kind = @kind");
      params.kind = normalizeEntityKind(options.kind);
    }

    let sql = "SELECT * FROM entities";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY updated_at DESC, title ASC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    }

    return (this.db.prepare(sql).all(params) as EntityRow[]).map(rowToEntity);
  }

  listEntityMentions(
    options: { pageId?: string | undefined; entityId?: string | undefined } = {}
  ): EntityMention[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.pageId) {
      conditions.push("page_id = @pageId");
      params.pageId = options.pageId;
    }

    if (options.entityId) {
      conditions.push("entity_id = @entityId");
      params.entityId = options.entityId;
    }

    let sql = "SELECT * FROM entity_mentions";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at ASC, id ASC";

    return (this.db.prepare(sql).all(params) as EntityMentionRow[]).map(rowToEntityMention);
  }

  listEntityLinks(
    options: {
      fromEntityId?: string | undefined;
      toEntityId?: string | undefined;
      origin?: EntityLinkOrigin | undefined;
    } = {}
  ): EntityLink[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.fromEntityId) {
      conditions.push("from_entity_id = @fromEntityId");
      params.fromEntityId = options.fromEntityId;
    }

    if (options.toEntityId) {
      conditions.push("to_entity_id = @toEntityId");
      params.toEntityId = options.toEntityId;
    }

    if (options.origin) {
      conditions.push("origin = @origin");
      params.origin = options.origin;
    }

    let sql = "SELECT * FROM entity_links";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at ASC, id ASC";

    return (this.db.prepare(sql).all(params) as EntityLinkRow[]).map(rowToEntityLink);
  }

  createProposal(input: CreateProposalInput): WikiProposal {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const proposal: WikiProposal = {
      id:
        input.id ??
        `proposal-${shortHash(`${input.title}:${input.proposedByAgentId}:${createdAt}`)}`,
      title: input.title.trim(),
      status: input.status ?? "pending",
      proposedByAgentId: input.proposedByAgentId,
      sourceCaptureId: input.sourceCaptureId,
      createdAt,
      payload: input.payload
    };

    if (!proposal.title) {
      throw new Error("Proposal title is required");
    }

    this.upsertProposalRow(proposal);
    return proposal;
  }

  getProposal(id: string): WikiProposal | null {
    const row = this.db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as
      | ProposalRow
      | undefined;
    return row ? rowToProposal(row) : null;
  }

  listProposals(
    options: { status?: ProposalStatus | undefined; limit?: number | undefined } = {}
  ): WikiProposal[] {
    const params: Record<string, unknown> = {};
    let sql = "SELECT * FROM proposals";

    if (options.status) {
      sql += " WHERE status = @status";
      params.status = options.status;
    }

    sql += " ORDER BY created_at DESC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    }

    return (this.db.prepare(sql).all(params) as ProposalRow[]).map(rowToProposal);
  }

  updateProposalStatus(
    id: string,
    status: ProposalStatus,
    options: { appliedAt?: string | null | undefined } = {}
  ): WikiProposal {
    assertProposalStatus(status);
    const appliedAt =
      options.appliedAt === undefined
        ? status === "accepted" || status === "applied"
          ? new Date().toISOString()
          : undefined
        : (options.appliedAt ?? undefined);

    this.db
      .prepare("UPDATE proposals SET status = ?, applied_at = ? WHERE id = ?")
      .run(status, appliedAt ?? null, id);

    return this.getRequiredProposal(id);
  }

  addPageRevision(input: CreatePageRevisionInput): PageRevision {
    const revision = createRevision(input);
    this.insertRevisionRow(revision);
    return revision;
  }

  getPageRevision(id: string): PageRevision | null {
    const row = this.db.prepare("SELECT * FROM page_revisions WHERE id = ?").get(id) as
      | RevisionRow
      | undefined;
    return row ? rowToRevision(row) : null;
  }

  listPageRevisions(pageId: string, options: { limit?: number | undefined } = {}): PageRevision[] {
    const params: Record<string, unknown> = { pageId };
    let sql = "SELECT * FROM page_revisions WHERE page_id = @pageId ORDER BY created_at DESC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    }

    return (this.db.prepare(sql).all(params) as RevisionRow[]).map(rowToRevision);
  }

  replacePageChunks(
    pageId: string,
    chunks: SaveChunkInput[],
    options: { now?: string | undefined } = {}
  ): WikiStoredChunk[] {
    const now = options.now ?? new Date().toISOString();
    const replace = this.db.transaction(() => {
      this.db.prepare("DELETE FROM chunks WHERE page_id = ?").run(pageId);

      for (const chunk of chunks) {
        this.upsertChunkRow({
          ...chunk,
          pageId,
          updatedAt: now
        });
      }
    });

    replace();
    return this.listChunks({ pageId });
  }

  getChunk(id: string): WikiStoredChunk | null {
    const row = this.db.prepare("SELECT * FROM chunks WHERE id = ?").get(id) as
      | ChunkRow
      | undefined;
    return row ? rowToChunk(row) : null;
  }

  listChunks(options: ListChunksOptions = {}): WikiStoredChunk[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.pageId) {
      conditions.push("page_id = @pageId");
      params.pageId = options.pageId;
    }

    let sql = "SELECT * FROM chunks";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY page_id ASC, chunk_index ASC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    } else if (options.offset !== undefined) {
      sql += " LIMIT -1";
    }

    if (options.offset !== undefined) {
      sql += " OFFSET @offset";
      params.offset = Math.max(0, Math.floor(options.offset));
    }

    return (this.db.prepare(sql).all(params) as ChunkRow[]).map(rowToChunk);
  }

  setChunkQdrantPointId(chunkId: string, qdrantPointId: string): WikiStoredChunk {
    this.db
      .prepare("UPDATE chunks SET qdrant_point_id = ? WHERE id = ?")
      .run(qdrantPointId, chunkId);
    const chunk = this.getChunk(chunkId);
    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkId}`);
    }
    return chunk;
  }

  createIndexJob(input: CreateIndexJobInput): WikiIndexJob {
    const job = createIndexJob(input);
    this.insertIndexJobRow(job);
    return job;
  }

  getIndexJob(id: string): WikiIndexJob | null {
    const row = this.db.prepare("SELECT * FROM index_jobs WHERE id = ?").get(id) as
      | IndexJobRow
      | undefined;
    return row ? rowToIndexJob(row) : null;
  }

  listIndexJobs(options: ListIndexJobsOptions = {}): WikiIndexJob[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.pageId) {
      conditions.push("page_id = @pageId");
      params.pageId = options.pageId;
    }

    if (options.status) {
      assertIndexJobStatus(options.status);
      conditions.push("status = @status");
      params.status = options.status;
    }

    let sql = "SELECT * FROM index_jobs";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at DESC, id ASC";

    if (options.limit !== undefined) {
      sql += " LIMIT @limit";
      params.limit = normalizeLimit(options.limit);
    }

    return (this.db.prepare(sql).all(params) as IndexJobRow[]).map(rowToIndexJob);
  }

  updateIndexJobStatus(
    id: string,
    status: IndexJobStatus,
    options: { error?: string | null | undefined; finishedAt?: string | null | undefined } = {}
  ): WikiIndexJob {
    assertIndexJobStatus(status);
    const finishedAt =
      options.finishedAt === undefined
        ? status === "done" || status === "failed"
          ? new Date().toISOString()
          : undefined
        : (options.finishedAt ?? undefined);

    this.db
      .prepare("UPDATE index_jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?")
      .run(status, options.error ?? null, finishedAt ?? null, id);

    const job = this.getIndexJob(id);
    if (!job) {
      throw new Error(`Index job not found: ${id}`);
    }
    return job;
  }

  getGraph(): PageGraph {
    return {
      pages: this.listPages(),
      links: this.listLinks()
    };
  }

  getEntityGraph(): EntityGraph {
    return {
      entities: this.listEntities(),
      links: this.listEntityLinks(),
      mentions: this.listEntityMentions(),
      pages: this.listPages()
    };
  }

  getKnowledgeGraph(): KnowledgeGraph {
    return buildKnowledgeGraph({
      pages: this.listPages(),
      pageLinks: this.listLinks(),
      entities: this.listEntities(),
      entityLinks: this.listEntityLinks(),
      mentions: this.listEntityMentions()
    });
  }

  getKnowledgeGraphNeighborhood(
    nodeId: string,
    options: KnowledgeGraphNeighborhoodOptions = {}
  ): KnowledgeGraphNeighborhood | null {
    const graph = this.getKnowledgeGraph();
    const center = graph.nodes.find((node) => node.id === nodeId);
    if (!center) return null;

    const depth = Math.max(0, Math.floor(options.depth ?? 1));
    const limit = normalizeLimit(options.limit ?? 100);
    const allowedKinds = new Set(options.nodeKinds ?? []);
    const selectedIds = traverseGraph(graph, nodeId, depth, limit);
    const filteredIds = new Set(
      [...selectedIds].filter((id) => {
        if (id === nodeId || allowedKinds.size === 0) return true;
        const node = graph.nodes.find((candidate) => candidate.id === id);
        return node ? allowedKinds.has(node.kind) : false;
      })
    );

    return filterKnowledgeGraph(graph, center, filteredIds);
  }

  rebuildEntityGraph(now = new Date().toISOString()): EntityGraph {
    const pages = this.listPages();
    const rebuild = this.db.transaction(() => {
      this.db.prepare("DELETE FROM entity_links").run();
      this.db.prepare("DELETE FROM entity_mentions").run();
      this.db.prepare("DELETE FROM entities").run();

      for (const page of pages) {
        this.replaceEntityMentionsForPage(page, now);
      }
    });

    rebuild();
    return this.getEntityGraph();
  }

  rebuildDerivedGraph(now = new Date().toISOString()): KnowledgeGraph {
    this.rebuildEntityGraph(now);
    return this.getKnowledgeGraph();
  }

  getEntityNeighborhood(
    entityId: string,
    options: EntityGraphNeighborhoodOptions = {}
  ): EntityNeighborhood | null {
    const depth = Math.max(0, Math.floor(options.depth ?? 1));
    const limit = normalizeLimit(options.limit ?? 100);
    const center = this.getEntity(entityId);
    if (!center) return null;

    const rows = this.db
      .prepare(
        `
          WITH RECURSIVE frontier(id, depth, path) AS (
            SELECT @entityId, 0, @entityId
            UNION ALL
            SELECT
              CASE
                WHEN l.from_entity_id = frontier.id THEN l.to_entity_id
                ELSE l.from_entity_id
              END,
              frontier.depth + 1,
              frontier.path || ',' ||
                CASE
                  WHEN l.from_entity_id = frontier.id THEN l.to_entity_id
                  ELSE l.from_entity_id
                END
            FROM frontier
            JOIN entity_links l
              ON l.from_entity_id = frontier.id OR l.to_entity_id = frontier.id
            WHERE frontier.depth < @depth
              AND instr(
                ',' || frontier.path || ',',
                ',' ||
                  CASE
                    WHEN l.from_entity_id = frontier.id THEN l.to_entity_id
                    ELSE l.from_entity_id
                  END ||
                ','
              ) = 0
          )
          SELECT DISTINCT id FROM frontier
          LIMIT @limit
        `
      )
      .all({ entityId, depth, limit }) as IdRow[];

    const entityIds = rows.map((row) => row.id);
    const allowedKinds = new Set((options.kinds ?? []).map((kind) => normalizeEntityKind(kind)));
    const entities =
      allowedKinds.size === 0
        ? this.getEntitiesByIds(entityIds)
        : this.getEntitiesByIds(entityIds).filter(
            (entity) => entity.id === entityId || allowedKinds.has(entity.kind)
          );
    const links = this.getLinksBetweenEntityIds(entities.map((entity) => entity.id));
    const mentions = this.getMentionsForEntityIds(entities.map((entity) => entity.id));
    const pages = this.getPagesByIds([...new Set(mentions.map((mention) => mention.pageId))]);

    return { center, entities, links, mentions, pages };
  }

  getBacklinks(pageId: string): WikiPage[] {
    const rows = this.db
      .prepare(
        `
          SELECT DISTINCT p.*
          FROM pages p
          JOIN links l ON l.from_page_id = p.id
          WHERE l.to_page_id = ?
          ORDER BY p.title ASC
        `
      )
      .all(pageId) as PageRow[];

    return rows.map(rowToPage);
  }

  getOutgoing(pageId: string): WikiPage[] {
    const rows = this.db
      .prepare(
        `
          SELECT DISTINCT p.*
          FROM pages p
          JOIN links l ON l.to_page_id = p.id
          WHERE l.from_page_id = ?
          ORDER BY p.title ASC
        `
      )
      .all(pageId) as PageRow[];

    return rows.map(rowToPage);
  }

  getPageWithLinks(pageId: string): PageWithLinks | null {
    const page = this.getPage(pageId);
    if (!page) return null;

    return {
      page,
      backlinks: this.getBacklinks(pageId),
      outgoing: this.getOutgoing(pageId)
    };
  }

  getPageNeighborhood(
    pageId: string,
    options: GraphNeighborhoodOptions = {}
  ): PageNeighborhood | null {
    const depth = Math.max(0, Math.floor(options.depth ?? 1));
    const limit = normalizeLimit(options.limit ?? 100);
    const center = this.getPage(pageId);
    if (!center) return null;

    const rows = this.db
      .prepare(
        `
          WITH RECURSIVE frontier(id, depth, path) AS (
            SELECT @pageId, 0, @pageId
            UNION ALL
            SELECT
              CASE
                WHEN l.from_page_id = frontier.id THEN l.to_page_id
                ELSE l.from_page_id
              END,
              frontier.depth + 1,
              frontier.path || ',' ||
                CASE
                  WHEN l.from_page_id = frontier.id THEN l.to_page_id
                  ELSE l.from_page_id
                END
            FROM frontier
            JOIN links l ON l.from_page_id = frontier.id OR l.to_page_id = frontier.id
            WHERE frontier.depth < @depth
              AND instr(
                ',' || frontier.path || ',',
                ',' ||
                  CASE
                    WHEN l.from_page_id = frontier.id THEN l.to_page_id
                    ELSE l.from_page_id
                  END ||
                ','
              ) = 0
          )
          SELECT DISTINCT id FROM frontier
          LIMIT @limit
        `
      )
      .all({ pageId, depth, limit }) as IdRow[];

    const pageIds = rows.map((row) => row.id);
    const allowedKinds = new Set((options.kinds ?? []).map((kind) => normalizePageKind(kind)));
    const pages =
      allowedKinds.size === 0
        ? this.getPagesByIds(pageIds)
        : this.getPagesByIds(pageIds).filter(
            (page) => page.id === pageId || allowedKinds.has(page.kind)
          );
    const links = this.getLinksBetweenPageIds(pages.map((page) => page.id));

    return { center, pages, links };
  }

  findPaths(fromPageId: string, toPageId: string, options: FindPathsOptions = {}): string[][] {
    if (fromPageId === toPageId) return [[fromPageId]];

    const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? 3));
    const limit = normalizeLimit(options.limit ?? 5);
    const links = this.listLinks();
    const paths: string[][] = [];
    const queue: string[][] = [[fromPageId]];

    while (queue.length > 0 && paths.length < limit) {
      const path = queue.shift();
      if (!path) break;
      const current = path[path.length - 1];
      if (!current || path.length - 1 >= maxDepth) continue;

      for (const link of links) {
        const next =
          link.fromPageId === current
            ? link.toPageId
            : link.toPageId === current
              ? link.fromPageId
              : null;
        if (!next || path.includes(next)) continue;

        const nextPath = [...path, next];
        if (next === toPageId) {
          paths.push(nextPath);
          if (paths.length >= limit) break;
        } else {
          queue.push(nextPath);
        }
      }
    }

    return paths;
  }

  listOrphanPages(kind?: PageKind): WikiPage[] {
    const params: Record<string, unknown> = {};
    let sql = `
      SELECT p.*
      FROM pages p
      WHERE NOT EXISTS (
        SELECT 1 FROM links l
        WHERE l.from_page_id = p.id OR l.to_page_id = p.id
      )
    `;

    if (kind) {
      sql += " AND p.kind = @kind";
      params.kind = normalizePageKind(kind);
    }

    sql += " ORDER BY p.title ASC";

    return (this.db.prepare(sql).all(params) as PageRow[]).map(rowToPage);
  }

  findMissingLinks(): MissingWikilink[] {
    const pages = this.listPages();
    const resolvePage = buildPageResolver(pages, this.listAliases());
    const missing: MissingWikilink[] = [];

    for (const page of pages) {
      for (const link of parseWikilinks(page.body)) {
        if (resolvePage(link.target)) continue;
        missing.push({
          pageId: page.id,
          pageTitle: page.title,
          target: link.target,
          sourceText: link.raw,
          index: link.index
        });
      }
    }

    return missing;
  }

  findDuplicateCandidates(): DuplicateCandidate[] {
    const groups = new Map<string, DuplicateCandidate>();

    for (const page of this.listPages()) {
      const normalizedTitle = normalizeTitle(page.title);
      const group = getDuplicateGroup(groups, normalizedTitle);
      group.pages.push(page);
    }

    for (const alias of this.listAliases()) {
      const group = getDuplicateGroup(groups, alias.normalizedAlias);
      group.aliases.push(alias);
    }

    return [...groups.values()].filter((group) => {
      const pageIds = new Set([
        ...group.pages.map((page) => page.id),
        ...group.aliases.map((alias) => alias.pageId)
      ]);
      return pageIds.size > 1;
    });
  }

  listRecentlyConnected(limit = 20): WikiLink[] {
    const rows = this.db
      .prepare("SELECT * FROM links ORDER BY created_at DESC, id ASC LIMIT ?")
      .all(normalizeLimit(limit)) as LinkRow[];
    return rows.map(rowToLink);
  }

  private getRequiredPage(id: string): WikiPage {
    const page = this.getPage(id);
    if (!page) {
      throw new Error(`Page not found: ${id}`);
    }
    return page;
  }

  private getRequiredProposal(id: string): WikiProposal {
    const proposal = this.getProposal(id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${id}`);
    }
    return proposal;
  }

  private upsertPageRow(page: WikiPage): void {
    assertPageKind(page.kind);
    assertPageStatus(page.status);

    this.db
      .prepare(
        `
          INSERT INTO pages (
            id,
            kind,
            title,
            slug,
            body,
            summary,
            status,
            source_url,
            source_type,
            trust,
            created_by_agent_id,
            created_at,
            updated_at,
            archived_at,
            metadata_json
          ) VALUES (
            @id,
            @kind,
            @title,
            @slug,
            @body,
            @summary,
            @status,
            @sourceUrl,
            @sourceType,
            @trust,
            @createdByAgentId,
            @createdAt,
            @updatedAt,
            @archivedAt,
            @metadataJson
          )
          ON CONFLICT(id) DO UPDATE SET
            kind = excluded.kind,
            title = excluded.title,
            slug = excluded.slug,
            body = excluded.body,
            summary = excluded.summary,
            status = excluded.status,
            source_url = excluded.source_url,
            source_type = excluded.source_type,
            trust = excluded.trust,
            created_by_agent_id = excluded.created_by_agent_id,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            archived_at = excluded.archived_at,
            metadata_json = excluded.metadata_json
        `
      )
      .run({
        id: page.id,
        kind: page.kind,
        title: page.title,
        slug: page.slug,
        body: page.body,
        summary: page.summary ?? null,
        status: page.status,
        sourceUrl: page.sourceUrl ?? null,
        sourceType: page.sourceType ?? null,
        trust: page.trust ?? null,
        createdByAgentId: page.createdByAgentId ?? null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        archivedAt: page.archivedAt ?? null,
        metadataJson: stringifyObjectJson(page.metadata)
      });
  }

  private upsertAliasRow(alias: PageAlias): void {
    this.db
      .prepare(
        `
          INSERT INTO page_aliases (id, page_id, alias, normalized_alias)
          VALUES (@id, @pageId, @alias, @normalizedAlias)
          ON CONFLICT(id) DO UPDATE SET
            page_id = excluded.page_id,
            alias = excluded.alias,
            normalized_alias = excluded.normalized_alias
        `
      )
      .run(alias);
  }

  private upsertLinkRow(link: WikiLink): void {
    assertLinkOrigin(link.origin);

    this.db
      .prepare(
        `
          INSERT INTO links (
            id,
            from_page_id,
            to_page_id,
            origin,
            source_text,
            created_by_agent_id,
            created_at
          ) VALUES (
            @id,
            @fromPageId,
            @toPageId,
            @origin,
            @sourceText,
            @createdByAgentId,
            @createdAt
          )
          ON CONFLICT(id) DO UPDATE SET
            from_page_id = excluded.from_page_id,
            to_page_id = excluded.to_page_id,
            origin = excluded.origin,
            source_text = excluded.source_text,
            created_by_agent_id = excluded.created_by_agent_id,
            created_at = excluded.created_at
        `
      )
      .run({
        id: link.id,
        fromPageId: link.fromPageId,
        toPageId: link.toPageId,
        origin: link.origin,
        sourceText: link.sourceText ?? null,
        createdByAgentId: link.createdByAgentId ?? null,
        createdAt: link.createdAt
      });
  }

  private upsertProposalRow(proposal: WikiProposal): void {
    assertProposalStatus(proposal.status);

    this.db
      .prepare(
        `
          INSERT INTO proposals (
            id,
            title,
            status,
            proposed_by_agent_id,
            source_capture_id,
            created_at,
            applied_at,
            payload_json
          ) VALUES (
            @id,
            @title,
            @status,
            @proposedByAgentId,
            @sourceCaptureId,
            @createdAt,
            @appliedAt,
            @payloadJson
          )
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            status = excluded.status,
            proposed_by_agent_id = excluded.proposed_by_agent_id,
            source_capture_id = excluded.source_capture_id,
            created_at = excluded.created_at,
            applied_at = excluded.applied_at,
            payload_json = excluded.payload_json
        `
      )
      .run({
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        proposedByAgentId: proposal.proposedByAgentId,
        sourceCaptureId: proposal.sourceCaptureId ?? null,
        createdAt: proposal.createdAt,
        appliedAt: proposal.appliedAt ?? null,
        payloadJson: JSON.stringify(proposal.payload ?? null)
      });
  }

  private insertRevisionRow(revision: PageRevision): void {
    this.db
      .prepare(
        `
          INSERT INTO page_revisions (
            id,
            page_id,
            body,
            title,
            changed_by,
            change_reason,
            created_at
          ) VALUES (
            @id,
            @pageId,
            @body,
            @title,
            @changedBy,
            @changeReason,
            @createdAt
          )
        `
      )
      .run({
        id: revision.id,
        pageId: revision.pageId,
        body: revision.body,
        title: revision.title,
        changedBy: revision.changedBy,
        changeReason: revision.changeReason ?? null,
        createdAt: revision.createdAt
      });
  }

  private upsertChunkRow(chunk: WikiStoredChunk): void {
    this.db
      .prepare(
        `
          INSERT INTO chunks (
            id,
            page_id,
            content_hash,
            chunk_index,
            text,
            token_count,
            qdrant_point_id,
            updated_at
          ) VALUES (
            @id,
            @pageId,
            @contentHash,
            @chunkIndex,
            @text,
            @tokenCount,
            @qdrantPointId,
            @updatedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            page_id = excluded.page_id,
            content_hash = excluded.content_hash,
            chunk_index = excluded.chunk_index,
            text = excluded.text,
            token_count = excluded.token_count,
            qdrant_point_id = excluded.qdrant_point_id,
            updated_at = excluded.updated_at
        `
      )
      .run({
        id: chunk.id,
        pageId: chunk.pageId,
        contentHash: chunk.contentHash,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        tokenCount: chunk.tokenCount ?? null,
        qdrantPointId: chunk.qdrantPointId ?? null,
        updatedAt: chunk.updatedAt
      });
  }

  private insertIndexJobRow(job: WikiIndexJob): void {
    assertIndexJobStatus(job.status);

    this.db
      .prepare(
        `
          INSERT INTO index_jobs (
            id,
            page_id,
            reason,
            status,
            error,
            created_at,
            finished_at
          ) VALUES (
            @id,
            @pageId,
            @reason,
            @status,
            @error,
            @createdAt,
            @finishedAt
          )
        `
      )
      .run({
        id: job.id,
        pageId: job.pageId,
        reason: job.reason,
        status: job.status,
        error: job.error ?? null,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt ?? null
      });
  }

  private replaceWikilinksForPage(page: WikiPage, now: string): void {
    const nextLinks = replaceWikilinkLinks(
      this.listLinks(),
      page,
      this.listPages(),
      this.listAliases(),
      now
    );

    this.db
      .prepare("DELETE FROM links WHERE from_page_id = ? AND origin = 'wikilink'")
      .run(page.id);

    for (const link of nextLinks) {
      if (link.fromPageId === page.id && link.origin === "wikilink") {
        this.upsertLinkRow(link);
      }
    }
  }

  private replaceEntityMentionsForPage(page: WikiPage, now: string): void {
    const mentions = this.deriveEntityMentionsForPage(page, now);
    const entityIds = [...new Set(mentions.map((mention) => mention.entityId))];

    this.db.prepare("DELETE FROM entity_mentions WHERE page_id = ?").run(page.id);
    this.db
      .prepare(
        "DELETE FROM entity_links WHERE source_page_id = ? AND origin IN ('co-mention', 'manual', 'page-title')"
      )
      .run(page.id);

    for (const mention of mentions) {
      this.upsertEntityMentionRow(mention);
    }

    for (let leftIndex = 0; leftIndex < entityIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entityIds.length; rightIndex += 1) {
        const left = entityIds[leftIndex];
        const right = entityIds[rightIndex];
        if (!left || !right || left === right) continue;
        this.upsertEntityLinkRow(createEntityLink(left, right, "co-mention", now, page.id));
      }
    }

    this.replaceManualEntityLinksForPage(page, now);
    this.deleteUnusedEntities();
  }

  private deriveEntityMentionsForPage(page: WikiPage, now: string): EntityMention[] {
    const mentions: EntityMention[] = [];
    const seen = new Set<string>();
    const pages = this.listPages();
    const resolvePage = buildPageResolver(pages, this.listAliases());
    const titleEntity = this.upsertPageEntityIfApplicable(page, now);

    if (titleEntity) {
      pushMention(mentions, seen, {
        id: createEntityMentionId(page.id, titleEntity.id, page.title, -1),
        pageId: page.id,
        entityId: titleEntity.id,
        sourceText: page.title,
        createdAt: now
      });
    }

    for (const link of parseWikilinks(page.body)) {
      const target = parseEntityTarget(link.target);
      const resolvedPage = resolvePage(link.target) ?? resolvePage(target.title);
      const entity = this.upsertEntityFromPageOrTarget(
        resolvedPage,
        target.kind,
        target.title,
        now
      );
      pushMention(mentions, seen, {
        id: createEntityMentionId(page.id, entity.id, link.raw, link.index),
        pageId: page.id,
        entityId: entity.id,
        sourceText: link.raw,
        createdAt: now
      });
    }

    for (const link of this.listLinks({ fromPageId: page.id, origin: "manual" })) {
      const linkedPage = this.getPage(link.toPageId);
      if (!linkedPage) continue;
      const entity = this.upsertPageEntityIfApplicable(linkedPage, now);
      if (!entity) continue;
      pushMention(mentions, seen, {
        id: createEntityMentionId(page.id, entity.id, link.sourceText ?? linkedPage.title, 0),
        pageId: page.id,
        entityId: entity.id,
        sourceText: link.sourceText ?? linkedPage.title,
        createdAt: now
      });
    }

    return mentions;
  }

  private upsertEntityFromPageOrTarget(
    page: WikiPage | null,
    explicitKind: string | undefined,
    fallbackTitle: string,
    now: string
  ): WikiEntity {
    if (page) {
      const pageEntity = this.upsertPageEntityIfApplicable(page, now, explicitKind);
      if (pageEntity) return pageEntity;
    }

    return this.upsertEntity({
      kind: explicitKind ?? pageEntityKind(page) ?? "entity",
      title: page?.title ?? fallbackTitle,
      summary: page?.summary,
      metadata: page ? { pageId: page.id } : {},
      now
    });
  }

  private upsertPageEntityIfApplicable(
    page: WikiPage,
    now: string,
    explicitKind?: string | undefined
  ): WikiEntity | null {
    const kind = explicitKind ?? pageEntityKind(page);
    if (!kind) return null;

    return this.upsertEntity({
      kind,
      title: page.title,
      summary: page.summary,
      metadata: { pageId: page.id, pageKind: page.kind },
      now
    });
  }

  private upsertEntity(input: {
    kind: string;
    title: string;
    summary?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    now: string;
  }): WikiEntity {
    const kind = normalizeEntityKind(input.kind);
    const title = input.title.trim();
    if (!title) {
      throw new Error("Entity title is required");
    }
    const slug = slugify(title) || shortHash(title);
    const existing = this.getEntityByKindSlug(kind, slug);
    const entity: WikiEntity = {
      id: existing?.id ?? createEntityId(kind, title),
      kind,
      title,
      slug,
      summary: input.summary ?? existing?.summary,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) }
    };

    this.upsertEntityRow(entity);
    return this.getEntity(entity.id) ?? entity;
  }

  private syncManualEntityLink(link: WikiLink, now: string): void {
    const fromPage = this.getPage(link.fromPageId);

    if (fromPage) {
      this.replaceEntityMentionsForPage(fromPage, now);
    }
  }

  private replaceManualEntityLinksForPage(page: WikiPage, now: string): void {
    const fromEntity = this.upsertPageEntityIfApplicable(page, now);
    if (!fromEntity) return;

    for (const link of this.listLinks({ fromPageId: page.id, origin: "manual" })) {
      const toPage = this.getPage(link.toPageId);
      if (!toPage) continue;
      const toEntity = this.upsertPageEntityIfApplicable(toPage, now);
      if (!toEntity || fromEntity.id === toEntity.id) continue;
      this.upsertEntityLinkRow(
        createEntityLink(fromEntity.id, toEntity.id, "manual", now, page.id)
      );
    }
  }

  private upsertEntityRow(entity: WikiEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO entities (
            id,
            kind,
            title,
            slug,
            summary,
            created_at,
            updated_at,
            metadata_json
          ) VALUES (
            @id,
            @kind,
            @title,
            @slug,
            @summary,
            @createdAt,
            @updatedAt,
            @metadataJson
          )
          ON CONFLICT(id) DO UPDATE SET
            kind = excluded.kind,
            title = excluded.title,
            slug = excluded.slug,
            summary = excluded.summary,
            updated_at = excluded.updated_at,
            metadata_json = excluded.metadata_json
        `
      )
      .run({
        id: entity.id,
        kind: entity.kind,
        title: entity.title,
        slug: entity.slug,
        summary: entity.summary ?? null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        metadataJson: stringifyObjectJson(entity.metadata)
      });
  }

  private upsertEntityMentionRow(mention: EntityMention): void {
    this.db
      .prepare(
        `
          INSERT INTO entity_mentions (id, page_id, entity_id, source_text, created_at)
          VALUES (@id, @pageId, @entityId, @sourceText, @createdAt)
          ON CONFLICT(id) DO UPDATE SET
            page_id = excluded.page_id,
            entity_id = excluded.entity_id,
            source_text = excluded.source_text,
            created_at = excluded.created_at
        `
      )
      .run({
        id: mention.id,
        pageId: mention.pageId,
        entityId: mention.entityId,
        sourceText: mention.sourceText,
        createdAt: mention.createdAt
      });
  }

  private upsertEntityLinkRow(link: EntityLink): void {
    assertEntityLinkOrigin(link.origin);

    this.db
      .prepare(
        `
          INSERT INTO entity_links (
            id,
            from_entity_id,
            to_entity_id,
            origin,
            source_page_id,
            created_at
          ) VALUES (
            @id,
            @fromEntityId,
            @toEntityId,
            @origin,
            @sourcePageId,
            @createdAt
          )
          ON CONFLICT(id) DO UPDATE SET
            from_entity_id = excluded.from_entity_id,
            to_entity_id = excluded.to_entity_id,
            origin = excluded.origin,
            source_page_id = excluded.source_page_id,
            created_at = excluded.created_at
        `
      )
      .run({
        id: link.id,
        fromEntityId: link.fromEntityId,
        toEntityId: link.toEntityId,
        origin: link.origin,
        sourcePageId: link.sourcePageId ?? null,
        createdAt: link.createdAt
      });
  }

  private getEntitiesByIds(ids: string[]): WikiEntity[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`SELECT * FROM entities WHERE id IN (${placeholders})`)
      .all(...ids) as EntityRow[];
    const byId = new Map(rows.map((row) => [row.id, rowToEntity(row)]));
    const entities: WikiEntity[] = [];

    for (const id of ids) {
      const entity = byId.get(id);
      if (entity) entities.push(entity);
    }

    return entities;
  }

  private getLinksBetweenEntityIds(entityIds: string[]): EntityLink[] {
    if (entityIds.length === 0) return [];

    const placeholders = entityIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM entity_links
          WHERE from_entity_id IN (${placeholders})
            AND to_entity_id IN (${placeholders})
          ORDER BY created_at ASC, id ASC
        `
      )
      .all(...entityIds, ...entityIds) as EntityLinkRow[];

    return rows.map(rowToEntityLink);
  }

  private getMentionsForEntityIds(entityIds: string[]): EntityMention[] {
    if (entityIds.length === 0) return [];

    const placeholders = entityIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM entity_mentions
          WHERE entity_id IN (${placeholders})
          ORDER BY created_at ASC, id ASC
        `
      )
      .all(...entityIds) as EntityMentionRow[];

    return rows.map(rowToEntityMention);
  }

  private deleteUnusedEntities(): void {
    this.db.exec(`
      DELETE FROM entities
      WHERE NOT EXISTS (
        SELECT 1 FROM entity_mentions m WHERE m.entity_id = entities.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM entity_links l
        WHERE l.from_entity_id = entities.id OR l.to_entity_id = entities.id
      );
    `);
  }

  private getPagesByIds(ids: string[]): WikiPage[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`SELECT * FROM pages WHERE id IN (${placeholders})`)
      .all(...ids) as PageRow[];
    const byId = new Map(rows.map((row) => [row.id, rowToPage(row)]));
    const pages: WikiPage[] = [];

    for (const id of ids) {
      const page = byId.get(id);
      if (page) pages.push(page);
    }

    return pages;
  }

  private getLinksBetweenPageIds(pageIds: string[]): WikiLink[] {
    if (pageIds.length === 0) return [];

    const placeholders = pageIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM links
          WHERE from_page_id IN (${placeholders})
            AND to_page_id IN (${placeholders})
          ORDER BY created_at ASC, id ASC
        `
      )
      .all(...pageIds, ...pageIds) as LinkRow[];

    return rows.map(rowToLink);
  }
}

export function createWikiRepository(db: WikiDatabase): WikiRepository {
  return new WikiRepository(db);
}

export function resolvePageReference(repo: WikiRepository, reference: string): WikiPage | null {
  const value = stripGraphNodePrefix(decodeURIComponent(reference).trim());
  const direct = repo.getPage(value) ?? repo.getPageBySlug(slugify(value));
  if (direct) return direct;

  const pageByTitle = repo
    .listPages()
    .find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(value));
  if (pageByTitle) return pageByTitle;

  const alias = repo.getAliasByNormalized(value);
  return alias ? repo.getPage(alias.pageId) : null;
}

export function resolveGraphFocusNode(
  repo: WikiRepository,
  graph: KnowledgeGraph,
  input: GraphFocusReference
): GraphNode | null {
  if (input.focusNodeId) return resolveGraphNodeReference(repo, graph, input.focusNodeId);
  if (input.focusPageId) return resolvePageGraphNodeReference(repo, graph, input.focusPageId);
  if (input.focusEntityId) return resolveEntityGraphNodeReference(graph, input.focusEntityId);
  if (input.focusId) return resolveGraphNodeReference(repo, graph, input.focusId);
  return null;
}

export function resolveGraphNodeReference(
  repo: WikiRepository,
  graph: KnowledgeGraph,
  reference: string
): GraphNode {
  const value = decodeURIComponent(reference).trim();
  const direct = graph.nodes.find((node) => node.id === value);
  if (direct) return direct;

  const pageNode = findPageGraphNodeReference(repo, graph, value);
  if (pageNode) return pageNode;

  const entityNode = findEntityGraphNodeReference(graph, value);
  if (entityNode) return entityNode;

  throw new Error(`Graph node not found: ${reference}`);
}

export function resolvePageGraphNodeReference(
  repo: WikiRepository,
  graph: KnowledgeGraph,
  reference: string
): GraphNode {
  const value = stripGraphNodePrefix(decodeURIComponent(reference).trim());
  const page = findPageReference(repo, value);
  if (!page) throw new Error(`Page not found: ${reference}`);

  const node = graph.nodes.find((candidate) => candidate.id === pageNodeId(page.id));
  if (!node) throw new Error(`Graph page node not found: ${reference}`);
  return node;
}

export function resolveEntityGraphNodeReference(
  graph: KnowledgeGraph,
  reference: string
): GraphNode {
  const node = findEntityGraphNodeReference(graph, reference);
  if (!node) throw new Error(`Graph entity node not found: ${reference}`);
  return node;
}

function findPageGraphNodeReference(
  repo: WikiRepository,
  graph: KnowledgeGraph,
  reference: string
): GraphNode | null {
  try {
    return resolvePageGraphNodeReference(repo, graph, reference);
  } catch (error) {
    if (error instanceof Error && isMissingPageGraphReferenceError(error)) return null;
    throw error;
  }
}

function findEntityGraphNodeReference(graph: KnowledgeGraph, reference: string): GraphNode | null {
  const decoded = decodeURIComponent(reference).trim();
  const value = stripGraphNodePrefix(decoded);
  const normalized = normalizeTitle(value);
  return (
    graph.nodes.find((candidate) => {
      const candidateEntityId = candidate.metadata.entityId;
      return (
        candidate.kind === "entity" &&
        (candidate.id === decoded ||
          candidate.id === entityNodeId(value) ||
          candidateEntityId === value ||
          normalizeTitle(candidate.title) === normalized)
      );
    }) ?? null
  );
}

function findPageReference(repo: WikiRepository, reference: string): WikiPage | null {
  return resolvePageReference(repo, reference);
}

function isMissingPageGraphReferenceError(error: Error): boolean {
  return (
    error.message.startsWith("Page not found:") ||
    error.message.startsWith("Graph page node not found:")
  );
}

function stripGraphNodePrefix(value: string): string {
  return value.replace(/^(page|entity|agent|resource):/, "");
}

function normalizePageForSave(page: WikiPage): WikiPage {
  const title = page.title.trim();
  if (!title) {
    throw new Error("Page title is required");
  }

  return {
    ...page,
    kind: normalizePageKind(page.kind),
    title,
    slug: page.slug || slugify(title),
    body: page.body ?? "",
    metadata: page.metadata ?? {}
  };
}

function rowToPage(row: PageRow): WikiPage {
  assertPageKind(row.kind);
  assertPageStatus(row.status);

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    body: row.body,
    summary: row.summary ?? undefined,
    status: row.status,
    sourceUrl: row.source_url ?? undefined,
    sourceType: row.source_type ?? undefined,
    trust: row.trust ?? undefined,
    createdByAgentId: row.created_by_agent_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    metadata: parseObjectJson(row.metadata_json, "pages.metadata_json")
  };
}

function rowToAlias(row: AliasRow): PageAlias {
  return {
    id: row.id,
    pageId: row.page_id,
    alias: row.alias,
    normalizedAlias: row.normalized_alias
  };
}

function rowToLink(row: LinkRow): WikiLink {
  assertLinkOrigin(row.origin);

  return {
    id: row.id,
    fromPageId: row.from_page_id,
    toPageId: row.to_page_id,
    origin: row.origin,
    sourceText: row.source_text ?? undefined,
    createdByAgentId: row.created_by_agent_id ?? undefined,
    createdAt: row.created_at
  };
}

function rowToEntity(row: EntityRow): WikiEntity {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parseObjectJson(row.metadata_json, "entities.metadata_json")
  };
}

function rowToEntityMention(row: EntityMentionRow): EntityMention {
  return {
    id: row.id,
    pageId: row.page_id,
    entityId: row.entity_id,
    sourceText: row.source_text,
    createdAt: row.created_at
  };
}

function rowToEntityLink(row: EntityLinkRow): EntityLink {
  assertEntityLinkOrigin(row.origin);

  return {
    id: row.id,
    fromEntityId: row.from_entity_id,
    toEntityId: row.to_entity_id,
    origin: row.origin,
    sourcePageId: row.source_page_id ?? undefined,
    createdAt: row.created_at
  };
}

function rowToProposal(row: ProposalRow): WikiProposal {
  assertProposalStatus(row.status);

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    proposedByAgentId: row.proposed_by_agent_id,
    sourceCaptureId: row.source_capture_id ?? undefined,
    createdAt: row.created_at,
    appliedAt: row.applied_at ?? undefined,
    payload: JSON.parse(row.payload_json) as unknown
  };
}

function rowToRevision(row: RevisionRow): PageRevision {
  return {
    id: row.id,
    pageId: row.page_id,
    body: row.body,
    title: row.title,
    changedBy: row.changed_by,
    changeReason: row.change_reason ?? undefined,
    createdAt: row.created_at
  };
}

function rowToChunk(row: ChunkRow): WikiStoredChunk {
  return {
    id: row.id,
    pageId: row.page_id,
    contentHash: row.content_hash,
    chunkIndex: row.chunk_index,
    text: row.text,
    tokenCount: row.token_count ?? undefined,
    qdrantPointId: row.qdrant_point_id ?? undefined,
    updatedAt: row.updated_at
  };
}

function rowToIndexJob(row: IndexJobRow): WikiIndexJob {
  assertIndexJobStatus(row.status);

  return {
    id: row.id,
    pageId: row.page_id,
    reason: row.reason,
    status: row.status,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? undefined
  };
}

function createAlias(pageId: string, aliasValue: string, id?: string): PageAlias {
  const alias = aliasValue.trim();
  if (!alias) {
    throw new Error("Alias is required");
  }

  return {
    id: id ?? createAliasId(pageId, alias),
    pageId,
    alias,
    normalizedAlias: normalizeTitle(alias)
  };
}

function createRevision(input: CreatePageRevisionInput): PageRevision {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id:
      input.id ??
      `revision-${shortHash(
        `${input.pageId}:${input.changedBy}:${input.title}:${input.body}:${createdAt}`
      )}`,
    pageId: input.pageId,
    body: input.body,
    title: input.title,
    changedBy: input.changedBy,
    changeReason: input.changeReason,
    createdAt
  };
}

function createIndexJob(input: CreateIndexJobInput): WikiIndexJob {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const status = input.status ?? "pending";
  assertIndexJobStatus(status);
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Index job reason is required");
  }
  return {
    id:
      input.id ??
      `index-job-${shortHash(
        `${input.pageId}:${reason}:${createdAt}:${Math.random().toString(36)}`
      )}`,
    pageId: input.pageId,
    reason,
    status,
    error: input.error,
    createdAt,
    finishedAt: input.finishedAt
  };
}

function createEntityLink(
  fromEntityId: string,
  toEntityId: string,
  origin: EntityLinkOrigin,
  createdAt: string,
  sourcePageId?: string | undefined
): EntityLink {
  const fromEntityIdCanonical = fromEntityId <= toEntityId ? fromEntityId : toEntityId;
  const toEntityIdCanonical = fromEntityId <= toEntityId ? toEntityId : fromEntityId;
  return {
    id: createEntityLinkId(fromEntityIdCanonical, toEntityIdCanonical, origin, sourcePageId),
    fromEntityId: fromEntityIdCanonical,
    toEntityId: toEntityIdCanonical,
    origin,
    sourcePageId,
    createdAt
  };
}

function buildKnowledgeGraph(input: {
  pages: WikiPage[];
  pageLinks: WikiLink[];
  entities: WikiEntity[];
  entityLinks: EntityLink[];
  mentions: EntityMention[];
}): KnowledgeGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const pagesById = new Map(input.pages.map((page) => [page.id, page]));
  const entitiesById = new Map(input.entities.map((entity) => [entity.id, entity]));

  for (const page of input.pages) {
    nodes.set(pageNodeId(page.id), {
      id: pageNodeId(page.id),
      kind: "page",
      subtype: page.kind,
      title: page.title,
      summary: page.summary,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      metadata: {
        pageId: page.id,
        slug: page.slug,
        status: page.status,
        sourceType: page.sourceType,
        trust: page.trust
      }
    });

    if (page.createdByAgentId) {
      const agentId = page.createdByAgentId.trim();
      const nodeId = agentNodeId(agentId);
      nodes.set(nodeId, {
        id: nodeId,
        kind: "agent",
        title: agentId,
        metadata: { agentId }
      });
      edges.set(createGraphEdgeId("created_by", page.id, agentId), {
        id: createGraphEdgeId("created_by", page.id, agentId),
        kind: "created_by",
        fromNodeId: pageNodeId(page.id),
        toNodeId: nodeId,
        origin: "system",
        sourcePageId: page.id,
        createdAt: page.createdAt,
        metadata: {}
      });
    }

    if (page.sourceUrl) {
      const nodeId = resourceNodeId(page.sourceUrl);
      nodes.set(nodeId, {
        id: nodeId,
        kind: "resource",
        subtype: page.sourceType,
        title: page.sourceUrl,
        metadata: { url: page.sourceUrl, sourceType: page.sourceType }
      });
      edges.set(createGraphEdgeId("sourced_from", page.id, page.sourceUrl), {
        id: createGraphEdgeId("sourced_from", page.id, page.sourceUrl),
        kind: "sourced_from",
        fromNodeId: pageNodeId(page.id),
        toNodeId: nodeId,
        origin: "system",
        sourcePageId: page.id,
        createdAt: page.createdAt,
        metadata: {}
      });
    }
  }

  for (const entity of input.entities) {
    nodes.set(entityNodeId(entity.id), {
      id: entityNodeId(entity.id),
      kind: "entity",
      subtype: entity.kind,
      title: entity.title,
      summary: entity.summary,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata: { ...entity.metadata, entityId: entity.id, slug: entity.slug }
    });
  }

  for (const link of input.pageLinks) {
    if (!pagesById.has(link.fromPageId) || !pagesById.has(link.toPageId)) continue;
    edges.set(createGraphEdgeId("links_to", link.id), {
      id: createGraphEdgeId("links_to", link.id),
      kind: "links_to",
      fromNodeId: pageNodeId(link.fromPageId),
      toNodeId: pageNodeId(link.toPageId),
      origin: link.origin,
      sourcePageId: link.fromPageId,
      createdAt: link.createdAt,
      metadata: {
        linkId: link.id,
        sourceText: link.sourceText,
        createdByAgentId: link.createdByAgentId
      }
    });
  }

  for (const mention of input.mentions) {
    const page = pagesById.get(mention.pageId);
    const entity = entitiesById.get(mention.entityId);
    if (!page || !entity) continue;

    const represents =
      metadataPageId(entity.metadata) === mention.pageId && mention.sourceText === page.title;
    const kind = represents ? "represents" : "mentions";
    const edgeId = represents
      ? createGraphEdgeId("represents", mention.pageId, mention.entityId)
      : createGraphEdgeId(kind, mention.id);
    edges.set(edgeId, {
      id: edgeId,
      kind,
      fromNodeId: pageNodeId(mention.pageId),
      toNodeId: entityNodeId(mention.entityId),
      origin: "derived",
      sourcePageId: mention.pageId,
      createdAt: mention.createdAt,
      metadata: {
        mentionId: mention.id,
        sourceText: mention.sourceText
      }
    });
  }

  for (const entity of input.entities) {
    const pageId = metadataPageId(entity.metadata);
    if (!pageId || !pagesById.has(pageId)) continue;
    const edgeId = createGraphEdgeId("represents", pageId, entity.id);
    if (edges.has(edgeId)) continue;
    edges.set(edgeId, {
      id: edgeId,
      kind: "represents",
      fromNodeId: pageNodeId(pageId),
      toNodeId: entityNodeId(entity.id),
      origin: "derived",
      sourcePageId: pageId,
      createdAt: entity.createdAt,
      metadata: { entityId: entity.id }
    });
  }

  for (const link of input.entityLinks) {
    if (!entitiesById.has(link.fromEntityId) || !entitiesById.has(link.toEntityId)) continue;
    edges.set(createGraphEdgeId("entity_link", link.id), {
      id: createGraphEdgeId("entity_link", link.id),
      kind: link.origin === "co-mention" ? "co_mentioned_with" : "related_to",
      fromNodeId: entityNodeId(link.fromEntityId),
      toNodeId: entityNodeId(link.toEntityId),
      origin: link.origin,
      sourcePageId: link.sourcePageId,
      createdAt: link.createdAt,
      metadata: { entityLinkId: link.id }
    });
  }

  return {
    nodes: [...nodes.values()].sort(compareGraphNodes),
    edges: [...edges.values()].sort(compareGraphEdges),
    pages: input.pages,
    pageLinks: input.pageLinks,
    entities: input.entities,
    entityLinks: input.entityLinks,
    mentions: input.mentions
  };
}

function traverseGraph(
  graph: KnowledgeGraph,
  rootId: string,
  depth: number,
  limit: number
): Set<string> {
  const selectedIds = new Set<string>([rootId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const from = adjacency.get(edge.fromNodeId) ?? [];
    from.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, from);

    const to = adjacency.get(edge.toNodeId) ?? [];
    to.push(edge.fromNodeId);
    adjacency.set(edge.toNodeId, to);
  }

  while (queue.length > 0 && selectedIds.size < limit) {
    const current = queue.shift();
    if (!current || current.depth >= depth) continue;

    for (const nextId of adjacency.get(current.id) ?? []) {
      if (selectedIds.has(nextId)) continue;
      selectedIds.add(nextId);
      queue.push({ id: nextId, depth: current.depth + 1 });
      if (selectedIds.size >= limit) break;
    }
  }

  return selectedIds;
}

function filterKnowledgeGraph(
  graph: KnowledgeGraph,
  center: GraphNode,
  selectedIds: Set<string>
): KnowledgeGraphNeighborhood {
  const edges = graph.edges.filter(
    (edge) => selectedIds.has(edge.fromNodeId) && selectedIds.has(edge.toNodeId)
  );
  const pageIds = new Set<string>();
  const entityIds = new Set<string>();

  for (const id of selectedIds) {
    if (id.startsWith("page:")) pageIds.add(id.slice("page:".length));
    if (id.startsWith("entity:")) entityIds.add(id.slice("entity:".length));
  }

  return {
    center,
    nodes: graph.nodes.filter((node) => selectedIds.has(node.id)),
    edges,
    pages: graph.pages.filter((page) => pageIds.has(page.id)),
    pageLinks: graph.pageLinks.filter(
      (link) => pageIds.has(link.fromPageId) && pageIds.has(link.toPageId)
    ),
    entities: graph.entities.filter((entity) => entityIds.has(entity.id)),
    entityLinks: graph.entityLinks.filter(
      (link) => entityIds.has(link.fromEntityId) && entityIds.has(link.toEntityId)
    ),
    mentions: graph.mentions.filter(
      (mention) => pageIds.has(mention.pageId) && entityIds.has(mention.entityId)
    )
  };
}

function pageNodeId(pageId: string): string {
  return createGraphNodeId("page", pageId);
}

function entityNodeId(entityId: string): string {
  return createGraphNodeId("entity", entityId);
}

function agentNodeId(agentId: string): string {
  return createGraphNodeId("agent", slugify(agentId) || shortHash(agentId));
}

function resourceNodeId(sourceUrl: string): string {
  return createGraphNodeId("resource", shortHash(sourceUrl));
}

function metadataPageId(metadata: Record<string, unknown>): string | null {
  const value = metadata.pageId;
  return typeof value === "string" ? value : null;
}

function compareGraphNodes(left: GraphNode, right: GraphNode): number {
  return (
    left.kind.localeCompare(right.kind) ||
    (left.subtype ?? "").localeCompare(right.subtype ?? "") ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}

function compareGraphEdges(left: GraphEdge, right: GraphEdge): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.fromNodeId.localeCompare(right.fromNodeId) ||
    left.toNodeId.localeCompare(right.toNodeId) ||
    left.id.localeCompare(right.id)
  );
}

function pushMention(mentions: EntityMention[], seen: Set<string>, mention: EntityMention): void {
  const key = `${mention.pageId}:${mention.entityId}:${mention.sourceText}`;
  if (seen.has(key)) return;
  seen.add(key);
  mentions.push(mention);
}

function parseEntityTarget(target: string): { kind?: string | undefined; title: string } {
  const trimmed = target.trim();
  const typed = /^([A-Za-z][A-Za-z0-9 _-]{1,31}):(.+)$/.exec(trimmed);
  if (!typed) return { title: trimmed };

  const kind = normalizeEntityKind(typed[1]);
  const title = typed[2]?.trim() ?? "";
  if (!title) return { title: trimmed };

  return { kind, title };
}

function pageEntityKind(page: WikiPage | null): string | null {
  if (!page) return null;

  const metadataKind = metadataString(page.metadata, "entityKind");
  if (metadataKind) return normalizeEntityKind(metadataKind);
  if (page.metadata.entity === false) return null;
  if (page.metadata.entity === true) return normalizeEntityKind(page.kind);
  return null;
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getDuplicateGroup(
  groups: Map<string, DuplicateCandidate>,
  normalizedTitle: string
): DuplicateCandidate {
  const existing = groups.get(normalizedTitle);
  if (existing) return existing;

  const group: DuplicateCandidate = {
    normalizedTitle,
    pages: [],
    aliases: []
  };
  groups.set(normalizedTitle, group);
  return group;
}

function optionalPatch<T>(value: T | null | undefined, existing: T | undefined): T | undefined {
  if (value === undefined) return existing;
  return value ?? undefined;
}

function assertPageStatus(value: string): asserts value is PageStatus {
  if (!pageStatuses.has(value)) {
    throw new Error(`Invalid page status: ${value}`);
  }
}

function assertLinkOrigin(value: string): asserts value is LinkOrigin {
  if (!linkOrigins.has(value)) {
    throw new Error(`Invalid link origin: ${value}`);
  }
}

function assertEntityLinkOrigin(value: string): asserts value is EntityLinkOrigin {
  if (!entityLinkOrigins.has(value)) {
    throw new Error(`Invalid entity link origin: ${value}`);
  }
}

function assertProposalStatus(value: string): asserts value is ProposalStatus {
  if (!proposalStatuses.has(value)) {
    throw new Error(`Invalid proposal status: ${value}`);
  }
}

function assertIndexJobStatus(value: string): asserts value is IndexJobStatus {
  if (!indexJobStatuses.has(value)) {
    throw new Error(`Invalid index job status: ${value}`);
  }
}

function parseObjectJson(value: string, fieldName: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error(`Invalid object JSON in ${fieldName}`);
}

function stringifyObjectJson(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {});
}

function normalizeLimit(value: number): number {
  return Math.max(1, Math.floor(value));
}

function toFtsQuery(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(" ");
}
