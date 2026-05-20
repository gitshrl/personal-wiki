import type { PageGraph, PageNeighborhood, WikiLink, WikiPage } from "./types";

export function getOutgoingPages(pageId: string, graph: PageGraph): WikiPage[] {
  const ids = graph.links.filter((link) => link.fromPageId === pageId).map((link) => link.toPageId);
  return uniquePages(ids, graph.pages);
}

export function getBacklinkPages(pageId: string, graph: PageGraph): WikiPage[] {
  const ids = graph.links.filter((link) => link.toPageId === pageId).map((link) => link.fromPageId);
  return uniquePages(ids, graph.pages);
}

export function getPageNeighborhood(
  pageId: string,
  graph: PageGraph,
  options: { depth?: number; limit?: number } = {}
): PageNeighborhood | null {
  const depth = options.depth ?? 1;
  const limit = options.limit ?? 100;
  const center = graph.pages.find((page) => page.id === pageId);
  if (!center) return null;

  const visited = new Set<string>([pageId]);
  const frontier: Array<{ id: string; depth: number }> = [{ id: pageId, depth: 0 }];

  for (let index = 0; index < frontier.length && visited.size < limit; index++) {
    const current = frontier[index];
    if (!current || current.depth >= depth) continue;
    for (const link of connectedLinks(current.id, graph.links)) {
      const nextId = link.fromPageId === current.id ? link.toPageId : link.fromPageId;
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      frontier.push({ id: nextId, depth: current.depth + 1 });
      if (visited.size >= limit) break;
    }
  }

  const pages = graph.pages.filter((page) => visited.has(page.id));
  const links = graph.links.filter(
    (link) => visited.has(link.fromPageId) && visited.has(link.toPageId)
  );

  return { center, pages, links };
}

export function findPagePaths(
  fromPageId: string,
  toPageId: string,
  graph: PageGraph,
  options: { maxDepth?: number; limit?: number } = {}
): string[][] {
  const maxDepth = options.maxDepth ?? 3;
  const limit = options.limit ?? 5;
  const paths: string[][] = [];
  const queue: string[][] = [[fromPageId]];

  while (queue.length > 0 && paths.length < limit) {
    const path = queue.shift();
    if (!path) break;
    const current = path[path.length - 1];
    if (!current || path.length - 1 > maxDepth) continue;
    if (current === toPageId) {
      paths.push(path);
      continue;
    }
    if (path.length - 1 === maxDepth) continue;

    for (const link of connectedLinks(current, graph.links)) {
      const next = link.fromPageId === current ? link.toPageId : link.fromPageId;
      if (path.includes(next)) continue;
      queue.push([...path, next]);
    }
  }

  return paths;
}

export function getOrphanPages(graph: PageGraph): WikiPage[] {
  const linkedIds = new Set<string>();
  for (const link of graph.links) {
    linkedIds.add(link.fromPageId);
    linkedIds.add(link.toPageId);
  }
  return graph.pages.filter((page) => !linkedIds.has(page.id));
}

function connectedLinks(pageId: string, links: WikiLink[]): WikiLink[] {
  return links.filter((link) => link.fromPageId === pageId || link.toPageId === pageId);
}

function uniquePages(ids: string[], pages: WikiPage[]): WikiPage[] {
  const seen = new Set<string>();
  const byId = new Map(pages.map((page) => [page.id, page]));
  const result: WikiPage[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const page = byId.get(id);
    if (!page) continue;
    seen.add(id);
    result.push(page);
  }
  return result;
}
