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

export function createLinkId(fromPageId: string, toPageId: string, sourceText: string): string {
  return `link-${shortHash(`${fromPageId}:${toPageId}:${sourceText}`)}`;
}

export function createAliasId(pageId: string, alias: string): string {
  return `alias-${shortHash(`${pageId}:${normalizeTitle(alias)}`)}`;
}

export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function normalizePageKind(value: string): string {
  return slugify(value) || "page";
}
