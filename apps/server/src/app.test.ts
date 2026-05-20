import { describe, expect, it } from "vitest";
import { createWikiRepository, openWikiDatabase } from "@personal-wiki/wiki-db";
import { createServerApp } from "./app";

describe("server app", () => {
  it("returns quiet empty payloads for a new local wiki", async () => {
    const { app, close } = createTestApp();

    try {
      const pages = await app.request("/api/pages");
      const pagesJson = (await pages.json()) as { pages: unknown[] };
      expect(pagesJson.pages).toEqual([]);

      const graph = await app.request("/api/graph");
      const graphJson = (await graph.json()) as { pages: unknown[]; links: unknown[] };
      expect(graphJson).toMatchObject({ pages: [], links: [] });

      const search = await app.request("/api/search?q=missing");
      const searchJson = (await search.json()) as { pages: unknown[] };
      expect(searchJson.pages).toEqual([]);
    } finally {
      close();
    }
  });

  it("creates pages, returns markdown, and searches", async () => {
    const { app, close } = createTestApp();

    try {
      const created = await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "topic",
          title: "MCP",
          body: "Model Context Protocol links agents to tools."
        })
      });

      expect(created.status).toBe(201);
      const createdJson = (await created.json()) as { page: { id: string } };

      const markdown = await app.request(`/api/pages/${createdJson.page.id}/markdown`);
      expect(markdown.headers.get("content-type")).toContain("text/markdown");
      expect(await markdown.text()).toContain("# MCP");

      const search = await app.request("/api/search?q=Protocol");
      const searchJson = (await search.json()) as { pages: Array<{ title: string }> };
      expect(searchJson.pages.map((page) => page.title)).toEqual(["MCP"]);
    } finally {
      close();
    }
  });

  it("normalizes custom page kinds", async () => {
    const { app, close } = createTestApp();

    try {
      const response = await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "chat session",
          title: "Planning chat"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as { page: { id: string; kind: string } };
      expect(json.page).toMatchObject({
        id: "chat-session-planning-chat",
        kind: "chat-session"
      });
    } finally {
      close();
    }
  });

  it("stores add-note requests as proposals by default", async () => {
    const { app, close } = createTestApp();

    try {
      const response = await app.request("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Session summary",
          body: "Useful MCP notes should compound in the wiki.",
          agentId: "codex"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as { mode: string; proposal: { status: string } };
      expect(json.mode).toBe("propose");
      expect(json.proposal.status).toBe("pending");
    } finally {
      close();
    }
  });

  it("can directly add notes and target-page links for local trusted use", async () => {
    const { app, close } = createTestApp();

    try {
      await app.request("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "topic", title: "Personal wiki" })
      });

      const response = await app.request("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Direct note",
          body: "Connect this note to a topic.",
          agentId: "codex",
          targetPages: ["Personal wiki"],
          mode: "direct"
        })
      });

      expect(response.status).toBe(201);
      const json = (await response.json()) as {
        mode: string;
        page: { id: string };
        linkedPageIds: string[];
      };
      expect(json.mode).toBe("direct");
      expect(json.linkedPageIds).toEqual(["topic-personal-wiki"]);

      const graph = await app.request(`/api/graph?focus=${json.page.id}`);
      const graphJson = (await graph.json()) as { pages: Array<{ id: string }> };
      expect(graphJson.pages.map((page) => page.id)).toContain("topic-personal-wiki");
    } finally {
      close();
    }
  });
});

function createTestApp() {
  const db = openWikiDatabase({ path: ":memory:" });
  const repo = createWikiRepository(db);
  return {
    app: createServerApp({
      repo,
      runtimePaths: {
        homeDir: "/tmp/personal-wiki-test",
        databasePath: ":memory:",
        configPath: "/tmp/personal-wiki-test/config.json",
        resourcesDir: "/tmp/personal-wiki-test/resources",
        uploadsDir: "/tmp/personal-wiki-test/uploads",
        qdrantStorageDir: "/tmp/personal-wiki-test/qdrant",
        logsDir: "/tmp/personal-wiki-test/logs",
        backupsDir: "/tmp/personal-wiki-test/backups"
      }
    }),
    close: () => db.close()
  };
}
