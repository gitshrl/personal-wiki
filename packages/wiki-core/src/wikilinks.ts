import { createLinkId, normalizeTitle, slugify } from "./ids";
import type { PageAlias, ParsedWikilink, ResolvedWikilink, WikiLink, WikiPage } from "./types";

const wikilinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function parseWikilinks(body: string): ParsedWikilink[] {
  const links: ParsedWikilink[] = [];
  for (const match of body.matchAll(wikilinkPattern)) {
    const raw = match[0];
    const target = match[1]?.trim();
    if (!target) continue;
    const label = match[2]?.trim() || target;
    links.push({
      raw,
      target,
      label,
      index: match.index ?? 0
    });
  }
  return links;
}

export function buildPageResolver(pages: WikiPage[], aliases: PageAlias[] = []) {
  const byTitle = new Map<string, WikiPage>();
  const bySlug = new Map<string, WikiPage>();
  const byAlias = new Map<string, WikiPage>();

  for (const page of pages) {
    byTitle.set(normalizeTitle(page.title), page);
    bySlug.set(page.slug, page);
  }

  for (const alias of aliases) {
    const page = pages.find((candidate) => candidate.id === alias.pageId);
    if (page) byAlias.set(alias.normalizedAlias, page);
  }

  return function resolvePageByTitle(value: string): WikiPage | null {
    const normalized = normalizeTitle(value);
    return byTitle.get(normalized) ?? byAlias.get(normalized) ?? bySlug.get(slugify(value)) ?? null;
  };
}

export function resolveWikilinks(
  page: WikiPage,
  pages: WikiPage[],
  aliases: PageAlias[] = []
): ResolvedWikilink[] {
  const resolve = buildPageResolver(pages, aliases);
  return parseWikilinks(page.body).map((link) => {
    const resolved = resolve(link.target);
    return {
      ...link,
      toPageId: resolved && resolved.id !== page.id ? resolved.id : null
    };
  });
}

export function deriveWikilinkLinks(
  page: WikiPage,
  pages: WikiPage[],
  aliases: PageAlias[] = [],
  now = new Date().toISOString()
): WikiLink[] {
  const seen = new Set<string>();
  const links: WikiLink[] = [];

  for (const resolved of resolveWikilinks(page, pages, aliases)) {
    if (!resolved.toPageId) continue;
    const dedupeKey = `${page.id}:${resolved.toPageId}:${resolved.raw}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    links.push({
      id: createLinkId(page.id, resolved.toPageId, resolved.raw),
      fromPageId: page.id,
      toPageId: resolved.toPageId,
      origin: "wikilink",
      sourceText: resolved.raw,
      createdByAgentId: page.createdByAgentId,
      createdAt: now
    });
  }

  return links;
}

export function replaceWikilinkLinks(
  allLinks: WikiLink[],
  page: WikiPage,
  pages: WikiPage[],
  aliases: PageAlias[] = [],
  now = new Date().toISOString()
): WikiLink[] {
  const kept = allLinks.filter(
    (link) => !(link.fromPageId === page.id && link.origin === "wikilink")
  );
  return [...kept, ...deriveWikilinkLinks(page, pages, aliases, now)];
}
