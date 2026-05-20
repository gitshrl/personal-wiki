export type EntityKind = "topic" | "article" | "person" | "agent" | "org";

export type Topic = {
  id: string;
  label: string;
  weight: number;
  status: string;
  summary: string;
  sources: number;
  backlinks: number;
};

export type Source = {
  id: string;
  type: string;
  title: string;
  url: string;
  fetched: string;
  trust: "high" | "med" | "low";
  author: string;
};

export type InboxItem = {
  id: string;
  capturedAt: string;
  type: string;
  title: string;
  status: string;
  tag: string;
  author: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type: EntityKind;
  weight: number;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: string;
  confidence: "high" | "medium" | "low";
};

export type WikiData = {
  generatedAt: string;
  topics: Topic[];
  sources: Source[];
  inbox: InboxItem[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  bodies: Record<string, string>;
};

export type WikiEntry = {
  id: string;
  kind: EntityKind;
  title: string;
  summary?: string;
  body?: string;
  author?: string;
  sourceType?: string;
  addedAt?: string;
  status?: string;
  weight?: number;
  backlinks?: number;
  url?: string;
  trust?: Source["trust"];
  tag?: string;
  isOwn?: boolean;
};

export const wikiData: WikiData = {
  generatedAt: "2026-05-20T18:49:00+07:00",
  topics: [
    {
      id: "topic-markets",
      label: "Markets",
      weight: 0.74,
      status: "watchlist",
      summary: "Macro, equities, FX. Fed path, rates, S&P and IDX moves tracked week to week.",
      sources: 6,
      backlinks: 12
    },
    {
      id: "topic-portfolio",
      label: "Portfolio",
      weight: 0.55,
      status: "project",
      summary:
        "Allocation, rebalancing rules, decisions log, and the boring core that should compound.",
      sources: 4,
      backlinks: 8
    },
    {
      id: "topic-personal-wiki",
      label: "Personal wiki",
      weight: 0.62,
      status: "project",
      summary:
        "Loka itself. A compounding knowledge graph that agents can maintain and humans can read.",
      sources: 4,
      backlinks: 7
    },
    {
      id: "topic-agent-tooling",
      label: "Agent tooling",
      weight: 0.92,
      status: "watchlist",
      summary: "Tools and workflows that let agents work with code, files, APIs, and memory.",
      sources: 14,
      backlinks: 22
    },
    {
      id: "topic-coding-agents",
      label: "Coding agents",
      weight: 0.85,
      status: "watchlist",
      summary:
        "Terminal-native and IDE-native coding agents. Codex, Claude Code, Qwen Code, and more.",
      sources: 11,
      backlinks: 19
    },
    {
      id: "topic-mcp",
      label: "MCP",
      weight: 0.78,
      status: "active",
      summary:
        "Model Context Protocol. A shared surface for model tool use and structured context.",
      sources: 6,
      backlinks: 11
    },
    {
      id: "topic-agent-memory",
      label: "Agent memory",
      weight: 0.71,
      status: "active",
      summary:
        "Retrieval, episodic memory, and long-context strategies for agents across sessions.",
      sources: 7,
      backlinks: 14
    },
    {
      id: "topic-html-artifacts",
      label: "HTML artifacts",
      weight: 0.66,
      status: "active",
      summary: "Rendering agent output as HTML instead of markdown: interactive, dense, queryable.",
      sources: 3,
      backlinks: 6
    },
    {
      id: "topic-crypto",
      label: "Crypto",
      weight: 0.66,
      status: "active",
      summary: "BTC, ETH, stablecoin flows, L2 progress. Half conviction, half curiosity.",
      sources: 5,
      backlinks: 9
    },
    {
      id: "topic-books",
      label: "Books",
      weight: 0.34,
      status: "active",
      summary: "Reading notes, claims worth keeping, and book-to-skill experiments.",
      sources: 3,
      backlinks: 5
    }
  ],
  sources: [
    {
      id: "src-karpathy-wiki",
      type: "gist",
      title: "karpathy/llm-wiki",
      url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f",
      fetched: "2026-05-18T22:11+07:00",
      trust: "high",
      author: "Andrej Karpathy"
    },
    {
      id: "src-thariq-html",
      type: "x-thread",
      title: "HTML artifacts > markdown",
      url: "https://x.com/trq212/status/2052809885763747935",
      fetched: "2026-05-19T08:30+07:00",
      trust: "med",
      author: "@trq212"
    },
    {
      id: "src-codex-readme",
      type: "repo",
      title: "openai/codex README",
      url: "https://github.com/openai/codex",
      fetched: "2026-05-20T08:14+07:00",
      trust: "high",
      author: "OpenAI"
    },
    {
      id: "src-bogle-3fund",
      type: "thread",
      title: "Bogleheads 3-fund portfolio FAQ",
      url: "https://bogleheads.org/wiki/Three-fund_portfolio",
      fetched: "2026-05-10T19:14+07:00",
      trust: "high",
      author: "Bogleheads"
    },
    {
      id: "src-fed-may26",
      type: "release",
      title: "FOMC May 2026 statement",
      url: "https://federalreserve.gov/newsevents/pressreleases",
      fetched: "2026-05-01T03:01+07:00",
      trust: "high",
      author: "Federal Reserve"
    },
    {
      id: "src-idx-quarterly",
      type: "filing",
      title: "BBCA Q1 2026 quarterly",
      url: "https://idx.co.id/bbca-q1-2026",
      fetched: "2026-05-05T10:00+07:00",
      trust: "high",
      author: "Bank Central Asia"
    },
    {
      id: "src-thinkfast",
      type: "book",
      title: "Thinking, Fast and Slow ch. 3 notes",
      url: "loka://notes/thinkfast-ch3",
      fetched: "2026-04-22T20:11+07:00",
      trust: "med",
      author: "Daniel Kahneman"
    }
  ],
  inbox: [
    {
      id: "ib-010",
      capturedAt: "2026-05-18T08:02+07:00",
      type: "note",
      title: "Decision: Cytoscape for v1 graph",
      status: "ingested",
      tag: "personal-wiki",
      author: "Codex"
    },
    {
      id: "ib-fin-5",
      capturedAt: "2026-05-19T08:14+07:00",
      type: "note",
      title: "Decision: trim ETH allocation 2% to 1%",
      status: "ingested",
      tag: "crypto",
      author: "Loka"
    },
    {
      id: "ib-011",
      capturedAt: "2026-05-17T19:40+07:00",
      type: "text",
      title: "Quote from Kahneman ch. 3",
      status: "ingested",
      tag: "books",
      author: "Claude"
    }
  ],
  graph: {
    nodes: [
      { id: "person-karpathy", label: "Andrej Karpathy", type: "person", weight: 0.5 },
      { id: "person-thariq", label: "@trq212", type: "person", weight: 0.3 },
      { id: "person-bogleheads", label: "Bogleheads", type: "person", weight: 0.35 },
      { id: "person-fed", label: "Federal Reserve", type: "person", weight: 0.45 },
      { id: "person-bca", label: "Bank Central Asia", type: "person", weight: 0.4 },
      { id: "person-kahneman", label: "Daniel Kahneman", type: "person", weight: 0.4 },
      { id: "agent-codex", label: "Codex", type: "agent", weight: 0.45 },
      { id: "agent-claude", label: "Claude", type: "agent", weight: 0.55 },
      { id: "agent-loka", label: "Loka", type: "agent", weight: 0.6 },
      { id: "org-openai", label: "OpenAI", type: "org", weight: 0.6 },
      { id: "org-anthropic", label: "Anthropic", type: "org", weight: 0.6 },
      { id: "org-bca", label: "Bank Central Asia", type: "org", weight: 0.5 }
    ],
    edges: [
      {
        from: "src-karpathy-wiki",
        to: "topic-personal-wiki",
        type: "supports",
        confidence: "high"
      },
      { from: "src-karpathy-wiki", to: "topic-agent-memory", type: "mentions", confidence: "high" },
      {
        from: "src-thariq-html",
        to: "topic-html-artifacts",
        type: "supports",
        confidence: "medium"
      },
      { from: "src-codex-readme", to: "topic-coding-agents", type: "mentions", confidence: "high" },
      { from: "src-codex-readme", to: "topic-agent-tooling", type: "mentions", confidence: "high" },
      { from: "src-bogle-3fund", to: "topic-portfolio", type: "supports", confidence: "high" },
      { from: "src-fed-may26", to: "topic-markets", type: "mentions", confidence: "high" },
      { from: "src-idx-quarterly", to: "topic-portfolio", type: "supports", confidence: "medium" },
      { from: "src-idx-quarterly", to: "topic-markets", type: "mentions", confidence: "medium" },
      { from: "src-thinkfast", to: "topic-books", type: "mentions", confidence: "high" },
      { from: "person-karpathy", to: "src-karpathy-wiki", type: "authored", confidence: "high" },
      { from: "person-thariq", to: "src-thariq-html", type: "authored", confidence: "high" },
      { from: "person-bogleheads", to: "src-bogle-3fund", type: "authored", confidence: "high" },
      { from: "person-fed", to: "src-fed-may26", type: "published", confidence: "high" },
      { from: "person-bca", to: "src-idx-quarterly", type: "published", confidence: "high" },
      { from: "person-kahneman", to: "src-thinkfast", type: "authored", confidence: "high" },
      { from: "agent-codex", to: "ib-010", type: "created", confidence: "high" },
      { from: "agent-loka", to: "ib-fin-5", type: "created", confidence: "high" },
      { from: "agent-claude", to: "ib-011", type: "created", confidence: "medium" },
      {
        from: "topic-coding-agents",
        to: "topic-agent-tooling",
        type: "subtopic_of",
        confidence: "high"
      },
      { from: "topic-mcp", to: "topic-agent-tooling", type: "subtopic_of", confidence: "high" },
      {
        from: "topic-html-artifacts",
        to: "topic-personal-wiki",
        type: "supports",
        confidence: "high"
      },
      {
        from: "topic-agent-memory",
        to: "topic-personal-wiki",
        type: "supports",
        confidence: "medium"
      },
      { from: "topic-crypto", to: "topic-markets", type: "subtopic_of", confidence: "high" },
      { from: "topic-portfolio", to: "topic-markets", type: "supports", confidence: "high" },
      { from: "org-openai", to: "src-codex-readme", type: "published", confidence: "high" },
      { from: "org-anthropic", to: "topic-mcp", type: "published", confidence: "high" },
      { from: "org-bca", to: "src-idx-quarterly", type: "published", confidence: "high" }
    ]
  },
  bodies: {
    "topic-personal-wiki":
      "This wiki should work like a small product surface, not a pile of documents. [[karpathy/llm-wiki]] gives the core pattern: compile knowledge once, then query the compiled pages.\n\nThe UI should stay dense. Search, backlinks, and the graph should help answer where an idea came from and where it points next.",
    "topic-agent-tooling":
      "Agent tooling is the loudest AI topic in this vault. [[Coding agents]], [[MCP]], and [[Agent memory]] all sit under it.\n\nThe useful tools are boring in the best way: files, structured context, repeatable commands, and clear state.",
    "topic-portfolio":
      "Portfolio is the decision log. The goal is to keep allocation boring enough that changes need a written reason.\n\nUseful links: [[Bogleheads 3-fund portfolio FAQ]], [[Decision: trim ETH allocation 2% to 1%]], and [[Markets]].",
    "src-karpathy-wiki":
      "Karpathy's pattern: stop having the LLM re-read raw documents on every question. Compile knowledge once into a structured, interlinked wiki.\n\nThree operations matter: **ingest**, **query**, and **lint**. The wiki becomes the codebase. The source pile becomes source code.\n\nThis directly shaped [[Personal wiki]] and connects to [[Agent memory]].",
    "src-thariq-html":
      "The argument is simple: dense agent output often works better as HTML than markdown. HTML can hold navigation, state, filters, tables, charts, and rich links.\n\nFor [[Personal wiki]], this supports a UI that feels closer to a tool than a document viewer. See [[HTML artifacts]].",
    "src-codex-readme":
      "Codex belongs in [[Coding agents]] and [[Agent tooling]]. The useful pattern is terminal-native work with direct access to files, commands, and tests.\n\nThe wiki should remember decisions from coding sessions, not just store final summaries.",
    "src-bogle-3fund":
      "The classic three-fund portfolio is total US stock, total international stock, and total bond market. No clever tilts, no leverage, no constant fiddling.\n\nThe underrated part is psychological. A simple rule reduces the number of ways to make a bad decision. That belongs in [[Portfolio]].",
    "src-fed-may26":
      "FOMC held in May 2026. The statement softened on labor market language and kept the path data-dependent.\n\nFor [[Markets]], this keeps the rate path live but not obvious. Watch CPI and the short end of the curve.",
    "src-idx-quarterly":
      "BBCA Q1 2026 net income beat consensus. NIM expanded year over year despite lower policy rates.\n\nThis is a reason to keep the name filed under [[Portfolio]] and [[Markets]], not just as a one-off filing.",
    "src-thinkfast":
      "Chapter 3 is about the lazy controller. When System 2 is taxed, System 1 substitutes an easier question.\n\nFor [[Portfolio]], the question can drift from 'is this still right for the plan?' to 'is this green today?'",
    "ib-010":
      "Decision: use Cytoscape.js for graph v1 later, not D3 or vis-network.\n\nFor this first shell, a lightweight SVG neighborhood is enough. The larger idea stays linked to [[Personal wiki]].",
    "ib-fin-5":
      "Trim ETH allocation from 2% to 1% of the portfolio.\n\nReasons: the satellite sleeve crept above the cap, BTC is doing the same job with simpler risks, and [[Portfolio]] needs fewer moving parts.",
    "ib-011":
      "Quote from Kahneman ch. 3: when faced with a hard question, people often answer an easier one instead.\n\nThis belongs with [[Books]] and has direct value for [[Portfolio]] decisions.",
    "person-karpathy":
      "Andrej Karpathy is tracked here because his wiki and agent notes keep producing useful design patterns for [[Personal wiki]] and [[Agent memory]].",
    "agent-codex":
      "Codex creates notes that come out of coding sessions, design decisions, and engineering tradeoffs. In this mock vault, it created [[Decision: Cytoscape for v1 graph]].",
    "agent-claude":
      "Claude captures longer-form reasoning notes and quotes from chat sessions. In this mock vault, it created [[Quote from Kahneman ch. 3]].",
    "agent-loka":
      "Loka is the local wiki agent. It ingests captures, suggests links, and keeps the graph tidy. In this mock vault, it created [[Decision: trim ETH allocation 2% to 1%]].",
    "org-openai": "OpenAI notes usually land in [[Agent tooling]] or [[Coding agents]].",
    "org-anthropic": "Anthropic is tracked here for Claude, skills, and [[MCP]].",
    "org-bca": "Bank Central Asia is tracked under [[Markets]] and [[Portfolio]]."
  }
};

export const pinnedEntries = [
  "topic-markets",
  "topic-portfolio",
  "topic-personal-wiki",
  "person-karpathy",
  "src-karpathy-wiki"
] as const;

export function buildEntries(data: WikiData): WikiEntry[] {
  const entries: WikiEntry[] = [];

  for (const topic of data.topics) {
    entries.push({
      id: topic.id,
      kind: "topic",
      title: topic.label,
      summary: topic.summary,
      body: data.bodies[topic.id],
      author: "you",
      status: topic.status,
      weight: topic.weight,
      backlinks: topic.backlinks
    });
  }

  for (const node of data.graph.nodes) {
    entries.push({
      id: node.id,
      kind: node.type,
      title: node.label,
      weight: node.weight,
      body: data.bodies[node.id]
    });
  }

  for (const source of data.sources) {
    entries.push({
      id: source.id,
      kind: "article",
      title: source.title,
      url: source.url,
      author: source.author,
      sourceType: source.type,
      addedAt: source.fetched.slice(0, 10),
      trust: source.trust,
      body: data.bodies[source.id],
      isOwn: false
    });
  }

  for (const item of data.inbox) {
    if (item.status !== "ingested" || !["note", "text"].includes(item.type)) {
      continue;
    }

    entries.push({
      id: item.id,
      kind: "article",
      title: item.title,
      tag: item.tag,
      author: item.author,
      sourceType: item.type,
      addedAt: item.capturedAt.slice(0, 10),
      body: data.bodies[item.id],
      isOwn: true
    });
  }

  return entries;
}
