import { describe, expect, it } from "vitest";
import { findPagePaths, getBacklinkPages, getPageNeighborhood } from "./graph";
import { createPage } from "./pages";
import type { PageGraph, WikiLink } from "./types";

const now = "2026-05-20T00:00:00.000Z";

describe("graph", () => {
  const mcp = createPage({ kind: "topic", title: "MCP" }, now);
  const wiki = createPage({ kind: "topic", title: "Personal wiki" }, now);
  const memory = createPage({ kind: "topic", title: "Agent memory" }, now);
  const note = createPage({ kind: "note", title: "Note" }, now);
  const links: WikiLink[] = [
    link(note.id, mcp.id),
    link(mcp.id, wiki.id),
    link(wiki.id, memory.id)
  ];
  const graph: PageGraph = { pages: [mcp, wiki, memory, note], links };

  it("supports user-defined page kinds", () => {
    const researchNote = createPage({ kind: "research note", title: "Planning note" }, now);

    expect(researchNote).toMatchObject({
      id: "research-note-planning-note",
      kind: "research-note"
    });
  });

  it("normalizes authored page kind aliases to note", () => {
    expect(createPage({ kind: "plan", title: "Roadmap" }, now)).toMatchObject({
      id: "note-roadmap",
      kind: "note"
    });
    expect(createPage({ kind: "design", title: "System shape" }, now)).toMatchObject({
      id: "note-system-shape",
      kind: "note"
    });
    expect(createPage({ kind: "article", title: "Write-up" }, now)).toMatchObject({
      id: "note-write-up",
      kind: "note"
    });
  });

  it("returns backlinks", () => {
    expect(getBacklinkPages(mcp.id, graph).map((page) => page.id)).toEqual([note.id]);
  });

  it("returns bounded neighborhoods", () => {
    const neighborhood = getPageNeighborhood(mcp.id, graph, { depth: 1 });
    expect(neighborhood?.pages.map((page) => page.id).sort()).toEqual(
      [mcp.id, note.id, wiki.id].sort()
    );
  });

  it("finds shallow paths", () => {
    expect(findPagePaths(note.id, memory.id, graph, { maxDepth: 3 })).toEqual([
      [note.id, mcp.id, wiki.id, memory.id]
    ]);
  });
});

function link(fromPageId: string, toPageId: string): WikiLink {
  return {
    id: `${fromPageId}-${toPageId}`,
    fromPageId,
    toPageId,
    origin: "wikilink",
    createdAt: now
  };
}
