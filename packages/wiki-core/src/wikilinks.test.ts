import { describe, expect, it } from "vitest";
import { createPage } from "./pages";
import { deriveWikilinkLinks, parseWikilinks, resolveWikilinks } from "./wikilinks";

const now = "2026-05-20T00:00:00.000Z";

describe("wikilinks", () => {
  it("parses plain and aliased wikilinks", () => {
    expect(parseWikilinks("Connect [[MCP]] and [[Personal wiki|the wiki]].")).toEqual([
      { raw: "[[MCP]]", target: "MCP", label: "MCP", index: 8 },
      {
        raw: "[[Personal wiki|the wiki]]",
        target: "Personal wiki",
        label: "the wiki",
        index: 20
      }
    ]);
  });

  it("resolves links by title, alias, and slug", () => {
    const mcp = createPage({ kind: "topic", title: "MCP" }, now);
    const memory = createPage({ kind: "topic", title: "Agent memory" }, now);
    const page = createPage(
      {
        kind: "note",
        title: "Note",
        body: "[[MCP]] links to [[AI memory]] and [[agent-memory]]."
      },
      now
    );

    const resolved = resolveWikilinks(
      page,
      [mcp, memory, page],
      [
        {
          id: "alias-agent-memory",
          pageId: memory.id,
          alias: "AI memory",
          normalizedAlias: "ai memory"
        }
      ]
    );

    expect(resolved.map((link) => link.toPageId)).toEqual([mcp.id, memory.id, memory.id]);
  });

  it("derives plain wikilink edges without self links", () => {
    const mcp = createPage({ kind: "topic", title: "MCP" }, now);
    const page = createPage({ kind: "note", title: "Note", body: "[[MCP]] and [[Note]]" }, now);

    const links = deriveWikilinkLinks(page, [mcp, page], [], now);

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      fromPageId: page.id,
      toPageId: mcp.id,
      origin: "wikilink",
      sourceText: "[[MCP]]"
    });
  });
});
