import { describe, expect, it } from "vitest";
import { createWikiRepository, openWikiDatabase } from "@personal-wiki/wiki-db";
import { addWikiNote, getWikiPage, queryWikiGraph, searchWiki } from "./wiki-tools";

describe("wiki MCP tool actions", () => {
  it("reads pages as Markdown by default", () => {
    const { context, close } = createContext();

    try {
      context.repo.createPage({
        kind: "topic",
        title: "MCP",
        body: "Model Context Protocol."
      });

      const result = getWikiPage(context, { id: "MCP" });
      expect(result.format).toBe("markdown");
      expect(result.markdown).toContain("# MCP");
    } finally {
      close();
    }
  });

  it("uses proposal mode for add-note by default", () => {
    const { context, close } = createContext();

    try {
      const result = addWikiNote(context, {
        title: "Session summary",
        body: "Save useful agent output.",
        agentId: "codex"
      });

      expect(result.mode).toBe("propose");
      expect(result.proposal?.status).toBe("pending");
    } finally {
      close();
    }
  });

  it("supports direct local note writes and graph queries", () => {
    const { context, close } = createContext();

    try {
      context.repo.createPage({ kind: "topic", title: "Personal wiki" });
      const result = addWikiNote(context, {
        title: "Direct note",
        body: "Connect to [[Personal wiki]].",
        agentId: "codex",
        targetPages: ["Personal wiki"],
        mode: "direct"
      });

      expect(result.page?.id).toBe("article-direct-note");
      expect(result.linkedPageIds).toEqual(["topic-personal-wiki"]);

      const graph = queryWikiGraph(context, { focusPageId: "article-direct-note" });
      expect(graph.pages.map((page) => page.id)).toContain("topic-personal-wiki");

      const search = searchWiki(context, { q: "Direct" });
      expect(search.pages.map((page) => page.id)).toContain("article-direct-note");
    } finally {
      close();
    }
  });
});

function createContext() {
  const db = openWikiDatabase({ path: ":memory:" });
  const repo = createWikiRepository(db);
  return {
    context: { repo },
    close: () => db.close()
  };
}
