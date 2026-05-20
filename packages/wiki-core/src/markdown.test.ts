import { describe, expect, it } from "vitest";
import { renderPageMarkdown } from "./markdown";
import { createPage } from "./pages";
import type { PageGraph, WikiLink } from "./types";

const now = "2026-05-20T00:00:00.000Z";

describe("markdown rendering", () => {
  it("renders agent-facing pages as markdown with metadata and links", () => {
    const mcp = createPage(
      {
        kind: "topic",
        title: "MCP",
        summary: "Agent protocol.",
        body: "Connects [[Personal wiki]] and agents."
      },
      now
    );
    const wiki = createPage({ kind: "topic", title: "Personal wiki" }, now);
    const links: WikiLink[] = [
      {
        id: "link-1",
        fromPageId: mcp.id,
        toPageId: wiki.id,
        origin: "wikilink",
        createdAt: now
      }
    ];
    const graph: PageGraph = { pages: [mcp, wiki], links };

    expect(renderPageMarkdown(mcp, graph)).toContain("# MCP\n\n## Summary\n\nAgent protocol.");
    expect(renderPageMarkdown(mcp, graph)).toContain("- [[Personal wiki]] (topic)");
  });
});
