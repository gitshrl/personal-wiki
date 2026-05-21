export type PageKind = string;

export type PageStatus = "active" | "archived" | "draft";

export type LinkOrigin = "wikilink" | "manual" | "proposal" | "system";

export type EntityKind = string;

export type EntityLinkOrigin = "co-mention" | "manual" | "page-title" | "system";

export type GraphNodeKind = "page" | "entity" | "agent" | "resource";

export type GraphEdgeKind =
  | "links_to"
  | "mentions"
  | "represents"
  | "created_by"
  | "sourced_from"
  | "co_mentioned_with"
  | "related_to";

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

export interface WikiEntity {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  summary?: string | undefined;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface EntityMention {
  id: string;
  pageId: string;
  entityId: string;
  sourceText: string;
  createdAt: string;
}

export interface EntityLink {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  origin: EntityLinkOrigin;
  sourcePageId?: string | undefined;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  subtype?: string | undefined;
  title: string;
  summary?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  origin: string;
  sourcePageId?: string | undefined;
  createdAt?: string | undefined;
  metadata: Record<string, unknown>;
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

export interface EntityGraph {
  entities: WikiEntity[];
  links: EntityLink[];
  mentions: EntityMention[];
  pages: WikiPage[];
}

export interface EntityNeighborhood {
  center: WikiEntity;
  entities: WikiEntity[];
  links: EntityLink[];
  mentions: EntityMention[];
  pages: WikiPage[];
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  pages: WikiPage[];
  pageLinks: WikiLink[];
  entities: WikiEntity[];
  entityLinks: EntityLink[];
  mentions: EntityMention[];
}

export interface KnowledgeGraphNeighborhood extends KnowledgeGraph {
  center: GraphNode;
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
