import { createHash } from "node:crypto";
export function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function slugify(value: string): string {
  return normalizeTitle(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createPageId(kind: string, title: string): string {
  const pageKind = normalizePageKind(kind);
  const slug = slugify(title);
  return `${pageKind}-${slug || shortHash(title)}`;
}

export function createEntityId(kind: string, title: string): string {
  const entityKind = normalizeEntityKind(kind);
  const slug = slugify(title);
  return `entity-${entityKind}-${slug || shortHash(title)}`;
}

export function createLinkId(fromPageId: string, toPageId: string, sourceText: string): string {
  return `link-${shortHash(`${fromPageId}:${toPageId}:${sourceText}`)}`;
}

export function createEntityMentionId(
  pageId: string,
  entityId: string,
  sourceText: string,
  index: number
): string {
  return `entity-mention-${shortHash(`${pageId}:${entityId}:${sourceText}:${index}`)}`;
}

export function createEntityLinkId(
  fromEntityId: string,
  toEntityId: string,
  origin: string,
  sourcePageId?: string | undefined
): string {
  const [left, right] = [fromEntityId, toEntityId].sort();
  return `entity-link-${shortHash(`${left}:${right}:${origin}:${sourcePageId ?? ""}`)}`;
}

export function createGraphNodeId(kind: string, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

export function createGraphEdgeId(kind: string, ...parts: string[]): string {
  return `graph-edge-${shortHash(`${kind}:${parts.join(":")}`)}`;
}

export function createAliasId(pageId: string, alias: string): string {
  return `alias-${shortHash(`${pageId}:${normalizeTitle(alias)}`)}`;
}

export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function normalizePageKind(value: string): string {
  const kind = slugify(value) || "page";
  if (kind === "article" || kind === "design" || kind === "plan") return "note";
  return kind;
}

export function normalizeEntityKind(value: string | undefined): string {
  return slugify(value ?? "") || "entity";
}
