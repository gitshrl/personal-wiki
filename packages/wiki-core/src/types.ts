export type PageKind = string;

export type PageStatus = "active" | "archived" | "draft";

export type LinkOrigin = "wikilink" | "manual" | "proposal" | "system";

export interface WikiPage {
  id: string;
  kind: PageKind;
  title: string;
  slug: string;
  body: string;
  summary?: string | undefined;
  status: PageStatus;
  sourceUrl?: string | undefined;
  sourceType?: string | undefined;
  trust?: string | undefined;
  createdByAgentId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface PageAlias {
  id: string;
  pageId: string;
  alias: string;
  normalizedAlias: string;
}

export interface WikiLink {
  id: string;
  fromPageId: string;
  toPageId: string;
  origin: LinkOrigin;
  sourceText?: string | undefined;
  createdByAgentId?: string | undefined;
  createdAt: string;
}

export interface ParsedWikilink {
  raw: string;
  target: string;
  label: string;
  index: number;
}

export interface ResolvedWikilink extends ParsedWikilink {
  toPageId: string | null;
}

export interface PageGraph {
  pages: WikiPage[];
  links: WikiLink[];
}

export interface PageWithLinks {
  page: WikiPage;
  backlinks: WikiPage[];
  outgoing: WikiPage[];
}

export interface PageNeighborhood {
  center: WikiPage;
  pages: WikiPage[];
  links: WikiLink[];
}

export interface CreatePageInput {
  kind: PageKind;
  title: string;
  body?: string | undefined;
  summary?: string | undefined;
  sourceUrl?: string | undefined;
  sourceType?: string | undefined;
  trust?: string | undefined;
  createdByAgentId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}
