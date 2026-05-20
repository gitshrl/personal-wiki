import { createHash } from "node:crypto";
import type { PageKind } from "./types";

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

export function createPageId(kind: PageKind, title: string): string {
  const slug = slugify(title);
  return `${kind}-${slug || shortHash(title)}`;
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
