import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ensurePersonalWikiRuntimeHome,
  getPersonalWikiRuntimePaths,
  renderPageMarkdown,
  type PersonalWikiRuntimePaths
} from "@personal-wiki/wiki-core";
import {
  createWikiRepository,
  openWikiDatabase,
  type WikiRepository
} from "@personal-wiki/wiki-db";
import {
  addWikiNote,
  appendWikiPage,
  deleteWikiNote,
  getPageByReference,
  getWikiPage,
  linkWikiPages,
  listRecentWikiPages,
  queryWikiGraph,
  queryWikiRag,
  rebuildWikiIndex,
  searchWiki,
  type WikiToolContext
} from "./wiki-tools";
import type { EmbeddingProvider, QdrantStore, WikiIndexConfig } from "@personal-wiki/wiki-index";

export interface CreatePersonalWikiMcpServerOptions {
  repo?: WikiRepository;
  runtimePaths?: PersonalWikiRuntimePaths;
  indexConfig?: WikiIndexConfig | undefined;
  embeddingProvider?: EmbeddingProvider | undefined;
  qdrant?: QdrantStore | undefined;
}

export function createPersonalWikiMcpServer(options: CreatePersonalWikiMcpServerOptions = {}) {
  const runtimePaths =
    options.runtimePaths ??
    (options.repo ? getPersonalWikiRuntimePaths() : ensurePersonalWikiRuntimeHome());
  const repo =
    options.repo ??
    createWikiRepository(openWikiDatabase({ path: runtimePaths.databasePath, migrate: true }));
  repo.rebuildDerivedGraph();
  const context: WikiToolContext = {
    repo,
    indexConfig: options.indexConfig,
    embeddingProvider: options.embeddingProvider,
    qdrant: options.qdrant
  };
  const server = new McpServer({
    name: "personal-wiki",
    version: "0.1.0"
  });

  server.registerResource(
    "wiki-recent-pages",
    "wiki://recent",
    {
      title: "Recent Personal Wiki Pages",
      description: "Recent pages from the local personal wiki.",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({ pages: listRecentWikiPages(context) }, null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "wiki-page",
    new ResourceTemplate("wiki://page/{id}", {
      list: async () => ({
        resources: listRecentWikiPages(context, 50).map((page) => ({
          uri: `wiki://page/${encodeURIComponent(page.id)}`,
          name: page.title,
          description: page.summary ?? `${page.kind} page`,
          mimeType: "text/markdown"
        }))
      }),
      complete: {
        id: async (value) =>
          listRecentWikiPages(context, 50)
            .filter((page) => page.id.includes(value) || page.title.toLowerCase().includes(value))
            .map((page) => page.id)
      }
    }),
    {
      title: "Personal Wiki Page",
      description: "A wiki page rendered as Markdown.",
      mimeType: "text/markdown"
    },
    async (uri, variables) => {
      const page = getPageByReference(repo, String(variables.id ?? ""));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: renderPageMarkdown(page, repo.getGraph())
          }
        ]
      };
    }
  );

  server.registerTool(
    "wiki_search",
    {
      title: "Search Wiki",
      description: "Search local personal wiki pages.",
      inputSchema: {
        q: z.string().default(""),
        limit: z.number().int().min(1).max(50).optional()
      }
    },
    async (input) => jsonToolResult(searchWiki(context, input))
  );

  server.registerTool(
    "wiki_get_page",
    {
      title: "Get Wiki Page",
      description: "Read a page from the personal wiki. Markdown is the default format.",
      inputSchema: {
        id: z.string().min(1),
        format: z.enum(["markdown", "json"]).optional()
      }
    },
    async (input) => {
      const result = getWikiPage(context, input);
      if (result.format === "markdown") {
        return textToolResult(result.markdown);
      }
      return jsonToolResult(result);
    }
  );

  server.registerTool(
    "wiki_graph_query",
    {
      title: "Query Wiki Graph",
      description: "Return the full heterogeneous graph or a local node neighborhood.",
      inputSchema: {
        focusNodeId: z.string().optional(),
        focusEntityId: z.string().optional(),
        focusId: z.string().optional(),
        focusPageId: z.string().optional(),
        depth: z.number().int().min(1).max(4).optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (input) => jsonToolResult(queryWikiGraph(context, input))
  );

  server.registerTool(
    "wiki_rag_query",
    {
      title: "Query Wiki Context",
      description: "Search the wiki with semantic RAG when indexed, falling back to SQLite FTS.",
      inputSchema: {
        query: z.string().default(""),
        limit: z.number().int().min(1).max(20).optional(),
        depth: z.number().int().min(0).max(3).optional(),
        format: z.enum(["markdown", "json"]).optional()
      }
    },
    async (input) => {
      const result = await queryWikiRag(context, input);
      if ((input.format ?? "markdown") === "markdown") {
        return textToolResult(result.markdown);
      }
      return jsonToolResult(result);
    }
  );

  server.registerTool(
    "wiki_rebuild_index",
    {
      title: "Rebuild Wiki Index",
      description: "Chunk pages, embed with OpenAI, and upsert vectors into Qdrant.",
      inputSchema: {
        pageIds: z.array(z.string().min(1)).optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (input) => jsonToolResult(await rebuildWikiIndex(context, input))
  );

  server.registerTool(
    "wiki_add_note",
    {
      title: "Add Wiki Note",
      description: "Add a note to the personal wiki. Defaults to proposal mode.",
      inputSchema: {
        title: z.string().min(1),
        body: z.string().min(1),
        kind: z.string().min(1).optional(),
        summary: z.string().trim().max(96).optional(),
        entityKind: z.string().trim().min(1).optional(),
        agentId: z.string().min(1),
        targetPages: z.array(z.string().min(1)).optional(),
        tags: z.array(z.string().min(1)).optional(),
        mode: z.enum(["propose", "direct"]).optional()
      }
    },
    async (input) => jsonToolResult(addWikiNote(context, input))
  );

  server.registerTool(
    "wiki_delete_note",
    {
      title: "Delete Wiki Note",
      description: "Delete a note/page from the personal wiki. Defaults to proposal mode.",
      inputSchema: {
        pageId: z.string().min(1),
        agentId: z.string().min(1),
        mode: z.enum(["propose", "direct"]).optional()
      }
    },
    async (input) => jsonToolResult(await deleteWikiNote(context, input))
  );

  server.registerTool(
    "wiki_append_page",
    {
      title: "Append Wiki Page",
      description: "Append text to an existing page. Defaults to proposal mode.",
      inputSchema: {
        pageId: z.string().min(1),
        body: z.string().min(1),
        agentId: z.string().min(1),
        mode: z.enum(["propose", "direct"]).optional()
      }
    },
    async (input) => jsonToolResult(appendWikiPage(context, input))
  );

  server.registerTool(
    "wiki_link_pages",
    {
      title: "Link Wiki Pages",
      description: "Create or propose a manual graph link between two pages.",
      inputSchema: {
        fromPageId: z.string().min(1),
        toPageId: z.string().min(1),
        agentId: z.string().min(1),
        sourceText: z.string().optional(),
        mode: z.enum(["propose", "direct"]).optional()
      }
    },
    async (input) => jsonToolResult(linkWikiPages(context, input))
  );

  server.registerTool(
    "wiki_runtime",
    {
      title: "Wiki Runtime",
      description: "Return local personal wiki runtime paths.",
      inputSchema: {}
    },
    async () => jsonToolResult({ runtime: runtimePaths })
  );

  return server;
}

function textToolResult(text: string) {
  return {
    content: [{ type: "text" as const, text }]
  };
}

function jsonToolResult(value: unknown) {
  return textToolResult(JSON.stringify(value, null, 2));
}
