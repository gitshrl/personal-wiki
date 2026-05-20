import {
  assertPageKind,
  buildPageResolver,
  createAliasId,
  createLinkId,
  createPage as createCorePage,
  normalizeTitle,
  parseWikilinks,
  replaceWikilinkLinks,
  shortHash,
  slugify
} from "@personal-wiki/wiki-core";
import type {
  CreatePageInput,
  LinkOrigin,
  PageAlias,
  PageGraph,
  PageKind,
  PageNeighborhood,
  PageStatus,
  PageWithLinks,
  WikiLink,
  WikiPage
} from "@personal-wiki/wiki-core";
import type { WikiDatabase } from "./database";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "applied";

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

export interface FindPathsOptions {
  maxDepth?: number | undefined;
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

interface IdRow {
  id: string;
}

const pageStatuses = new Set<string>(["active", "archived", "draft"]);
const linkOrigins = new Set<string>(["wikilink", "manual", "proposal", "system"]);
const proposalStatuses = new Set<string>(["pending", "accepted", "rejected", "applied"]);

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

      if (options.updateWikilinks ?? true) {
        this.replaceWikilinksForPage(normalizedPage, now);
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
      params.kind = options.kind;
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
    this.db.prepare("DELETE FROM links WHERE id = ?").run(id);
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

  getGraph(): PageGraph {
    return {
      pages: this.listPages(),
      links: this.listLinks()
    };
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
    const allowedKinds = new Set(options.kinds ?? []);
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
      params.kind = kind;
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

function normalizePageForSave(page: WikiPage): WikiPage {
  const title = page.title.trim();
  if (!title) {
    throw new Error("Page title is required");
  }

  return {
    ...page,
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

function assertProposalStatus(value: string): asserts value is ProposalStatus {
  if (!proposalStatuses.has(value)) {
    throw new Error(`Invalid proposal status: ${value}`);
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
