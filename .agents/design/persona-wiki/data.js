// Loka — sample knowledge base
// AI/agent tooling examples (drawn from real GitHub orgs in the user's gist)
// + a handful of personal-knowledge items (book notes, ideas, decisions)

window.LOKA_DATA = (function () {
  const now = "2026-05-20T18:49:00+07:00";

  const sources = [
    { id: "src-goodailist-w20", type: "report",   title: "Good AI List — Top 100 (week 20)", url: "https://goodailist.com/repos", fetched: "2026-05-20T11:02+07:00", trust: "high",   author: "goodailist",     claims: 6 },
    { id: "src-karpathy-wiki",  type: "gist",     title: "karpathy/llm-wiki",                 url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f", fetched: "2026-05-18T22:11+07:00", trust: "high", author: "karpathy",  claims: 4 },
    { id: "src-thariq-html",    type: "x-thread", title: "HTML artifacts > markdown",          url: "https://x.com/trq212/status/2052809885763747935",              fetched: "2026-05-19T08:30+07:00", trust: "med",    author: "@trq212",          claims: 2 },
    { id: "src-codex-readme",   type: "repo",     title: "openai/codex — README",              url: "https://github.com/openai/codex",                              fetched: "2026-05-20T08:14+07:00", trust: "high",   author: "openai",           claims: 3 },
    { id: "src-skills-anth",    type: "repo",     title: "anthropics/skills",                  url: "https://github.com/anthropics/skills",                         fetched: "2026-05-20T08:14+07:00", trust: "high",   author: "anthropics",       claims: 2 },
    { id: "src-qwen-code",      type: "repo",     title: "QwenLM/qwen-code",                   url: "https://github.com/QwenLM/qwen-code",                          fetched: "2026-05-20T08:14+07:00", trust: "high",   author: "QwenLM",           claims: 2 },
    { id: "src-deepep",         type: "repo",     title: "deepseek-ai/DeepEP",                 url: "https://github.com/deepseek-ai/DeepEP",                        fetched: "2026-05-20T08:14+07:00", trust: "high",   author: "deepseek-ai",      claims: 1 },
    { id: "src-kimi-cli",       type: "repo",     title: "MoonshotAI/kimi-cli",                url: "https://github.com/MoonshotAI/kimi-cli",                       fetched: "2026-05-20T08:14+07:00", trust: "high",   author: "MoonshotAI",       claims: 1 },
    { id: "src-mcp-spec",       type: "docs",     title: "Model Context Protocol — spec",      url: "https://modelcontextprotocol.io",                              fetched: "2026-05-15T10:00+07:00", trust: "high",   author: "Anthropic",        claims: 4 },
    { id: "src-thinkfast",      type: "book",     title: "Thinking, Fast and Slow — ch. 3 notes", url: "loka://notes/thinkfast-ch3",                                fetched: "2026-04-22T20:11+07:00", trust: "med",    author: "Kahneman",         claims: 3 },
    { id: "src-reddit-rag",     type: "reddit",   title: "r/LocalLLaMA — \"why RAG keeps re-discovering\"", url: "https://reddit.com/r/LocalLLaMA/comments/abc", fetched: "2026-05-16T09:40+07:00", trust: "low", author: "u/quiet_eval", claims: 1 },
    { id: "src-brain-personal-wiki", type: "brainstorm", title: "Brainstorm — Personal wiki UX (Codex)", url: "loka://brainstorms/personal-wiki", fetched: "2026-05-20T17:02+07:00", trust: "med", author: "codex+me", claims: 5 },

    // ── finance / markets / crypto ─────────────────────────────
    { id: "src-buffett-2025",   type: "letter",   title: "Berkshire 2025 Annual Letter",         url: "https://berkshirehathaway.com/letters/2025ltr.pdf", fetched: "2026-03-01T09:00+07:00", trust: "high", author: "Warren Buffett", claims: 4 },
    { id: "src-bogle-3fund",    type: "thread",   title: "Bogleheads — 3-fund portfolio FAQ",    url: "https://bogleheads.org/wiki/Three-fund_portfolio", fetched: "2026-05-10T19:14+07:00", trust: "high", author: "Bogleheads", claims: 3 },
    { id: "src-tv-spx",         type: "chart",    title: "SPX weekly · breakout vs 200d",        url: "https://tradingview.com/chart/spx",                fetched: "2026-05-20T07:30+07:00", trust: "med",  author: "you · TradingView", claims: 2 },
    { id: "src-eth-roadmap",    type: "docs",     title: "Ethereum roadmap — pectra recap",      url: "https://ethereum.org/roadmap",                     fetched: "2026-05-18T11:00+07:00", trust: "high", author: "ethereum.org", claims: 2 },
    { id: "src-cg-stablecoins", type: "report",   title: "CoinGecko — stablecoin flows Q1 2026", url: "https://coingecko.com/research/stablecoins-q1-2026", fetched: "2026-04-30T15:20+07:00", trust: "med", author: "CoinGecko", claims: 3 },
    { id: "src-fed-may26",      type: "release",  title: "FOMC May 2026 statement",              url: "https://federalreserve.gov/newsevents/pressreleases", fetched: "2026-05-01T03:01+07:00", trust: "high", author: "Federal Reserve", claims: 2 },
    { id: "src-idx-quarterly",  type: "filing",   title: "BBCA Q1 2026 quarterly",               url: "https://idx.co.id/bbca-q1-2026",                   fetched: "2026-05-05T10:00+07:00", trust: "high", author: "Bank Central Asia", claims: 2 },
    { id: "src-pieter-essay",   type: "essay",    title: "Pieter Levels — on cashflow > equity", url: "https://levels.io/cashflow",                       fetched: "2026-05-12T22:11+07:00", trust: "med", author: "@levelsio", claims: 1 },
  ];

  const inbox = [
    { id: "ib-001", capturedAt: "2026-05-20T18:31+07:00", type: "x-thread", title: "Thariq — HTML > markdown for agent artifacts", platform: "x", status: "triaged",     tag: "agent-ui",        author: "Loka" },
    { id: "ib-002", capturedAt: "2026-05-20T17:02+07:00", type: "brainstorm", title: "Personal wiki UX (with Codex)",            platform: "codex", status: "ingested",  tag: "personal-wiki",   author: "Codex" },
    { id: "ib-003", capturedAt: "2026-05-20T15:48+07:00", type: "url",      title: "goodailist.com — top 100 snapshot",          platform: "manual", status: "ingested", tag: "watchlist",      author: "Loka" },
    { id: "ib-fin-1", capturedAt: "2026-05-20T15:10+07:00", type: "chart", title: "SPX broke 200d weekly — saved chart",          platform: "manual", status: "captured", tag: "macro",          author: "Loka" },
    { id: "ib-fin-2", capturedAt: "2026-05-20T14:22+07:00", type: "x-thread", title: "@RaoulGMI — BTC cycle update",              platform: "x",      status: "triaged",  tag: "crypto",         author: "Loka" },
    { id: "ib-004", capturedAt: "2026-05-20T14:11+07:00", type: "text",      title: "Idea: turn weekly digest into a card pack",  platform: "manual", status: "captured", tag: "idea",            author: "Loka" },
    { id: "ib-fin-3", capturedAt: "2026-05-20T11:40+07:00", type: "filing",  title: "BBCA Q1 2026 — review highlights",          platform: "manual", status: "needs-review", tag: "idx",       author: "Loka" },
    { id: "ib-005", capturedAt: "2026-05-20T11:30+07:00", type: "screenshot", title: "DeepEP arch diagram",                       platform: "manual", status: "needs-review", tag: "infra",      author: "Loka" },
    { id: "ib-006", capturedAt: "2026-05-19T22:15+07:00", type: "reddit",   title: "r/LocalLLaMA — why RAG keeps re-discovering", platform: "reddit", status: "needs-review", tag: "memory",     author: "Loka" },
    { id: "ib-fin-4", capturedAt: "2026-05-19T20:00+07:00", type: "thread", title: "Bogleheads — when to rebalance",              platform: "manual", status: "ingested", tag: "portfolio",      author: "Loka" },
    { id: "ib-007", capturedAt: "2026-05-19T19:00+07:00", type: "pdf",      title: "Hallucination benchmark — TrivialPlus.pdf",   platform: "manual", status: "captured", tag: "evals",          author: "Loka" },
    { id: "ib-fin-5", capturedAt: "2026-05-19T08:14+07:00", type: "note",   title: "Decision: trim ETH allocation 2% → 1%",       platform: "manual", status: "ingested", tag: "crypto",         author: "Loka" },
    { id: "ib-008", capturedAt: "2026-05-19T10:20+07:00", type: "chat",     title: "Claude session — agent memory patterns",      platform: "claude", status: "triaged",  tag: "memory",          author: "Claude" },
    { id: "ib-009", capturedAt: "2026-05-18T21:11+07:00", type: "repo",     title: "github.com/QwenLM/qwen-code",                 platform: "manual", status: "ingested", tag: "agent-cli",       author: "Loka" },
    { id: "ib-fin-6", capturedAt: "2026-05-18T16:00+07:00", type: "release",title: "Fed May statement — hawkish hold",           platform: "manual", status: "ingested", tag: "macro",           author: "Loka" },
    { id: "ib-010", capturedAt: "2026-05-18T08:02+07:00", type: "note",     title: "Decision: Cytoscape for v1 graph",            platform: "manual", status: "ingested", tag: "personal-wiki",   author: "Codex" },
    { id: "ib-011", capturedAt: "2026-05-17T19:40+07:00", type: "text",     title: "Quote from Kahneman ch.3 — system 1 substitution", platform: "manual", status: "ingested", tag: "books",     author: "Claude" },
    { id: "ib-012", capturedAt: "2026-05-17T11:20+07:00", type: "x-thread", title: "Karpathy on small models doing big jobs",     platform: "x",      status: "archived", tag: "models",          author: "Loka" },
  ];

  const topics = [
    { id: "topic-agent-tooling",   label: "Agent tooling",        weight: 0.92, status: "watchlist", summary: "Tools and workflows that let agents work with code, files, APIs, and memory. Loudest signal this week — 38 of GAL top-100 sit here.", sources: 14, claims: 9, backlinks: 22 },
    { id: "topic-mcp",             label: "MCP",                  weight: 0.78, status: "active",    summary: "Model Context Protocol. Open standard for letting models call tools and read structured context across vendors.", sources: 6, claims: 4, backlinks: 11 },
    { id: "topic-agent-memory",    label: "Agent memory",         weight: 0.71, status: "active",    summary: "Retrieval, episodic memory, and long-context strategies for agents that survive across sessions.", sources: 7, claims: 5, backlinks: 14 },
    { id: "topic-html-artifacts",  label: "HTML artifacts",       weight: 0.66, status: "active",    summary: "Rendering agent output as HTML instead of markdown — interactive, dense, queryable.", sources: 3, claims: 2, backlinks: 6 },
    { id: "topic-china-frontier",  label: "China frontier labs",  weight: 0.81, status: "watchlist", summary: "Qwen, DeepSeek, Moonshot/Kimi, MiniMax, StepFun, Tencent Hunyuan. Strong agent + infra + multimodal motion.", sources: 9, claims: 6, backlinks: 18 },
    { id: "topic-coding-agents",   label: "Coding agents",        weight: 0.85, status: "watchlist", summary: "Terminal-native and IDE-native coding agents. codex, claude-code, qwen-code, kimi-cli, opencode, etc.", sources: 11, claims: 7, backlinks: 19 },
    { id: "topic-evals",           label: "Evals & benchmarks",   weight: 0.54, status: "active",    summary: "Eval scaffolds, benchmark releases, and the slow shift from leaderboards to behavior tests.", sources: 5, claims: 4, backlinks: 9 },
    { id: "topic-personal-wiki",   label: "Personal wiki",        weight: 0.62, status: "project",   summary: "Self-project. Loka itself. Compounding knowledge graph, agent-maintained, HTML-rendered.", sources: 4, claims: 5, backlinks: 7 },
    { id: "topic-books",           label: "Books",                weight: 0.34, status: "active",    summary: "Reading notes, claims worth keeping, book-to-skill experiments.", sources: 3, claims: 4, backlinks: 5 },
    { id: "topic-infra",           label: "Inference & runtime",  weight: 0.58, status: "active",    summary: "Kernels, schedulers, distributed FS. DeepEP, DeepGEMM, FlashMLA, TensorRT-LLM, mlx.", sources: 6, claims: 3, backlinks: 10 },

    // ── finance / markets / crypto ──────────────────────────────────────
    { id: "topic-markets",         label: "Markets",              weight: 0.74, status: "watchlist", summary: "Macro, equities, FX. Fed path, rates, S&P/IDX moves. What you actually track week-to-week.", sources: 6, claims: 5, backlinks: 12 },
    { id: "topic-crypto",          label: "Crypto",               weight: 0.66, status: "active",    summary: "BTC, ETH, stablecoin flows, L2 progress. Half conviction, half curiosity.", sources: 5, claims: 4, backlinks: 9 },
    { id: "topic-portfolio",       label: "Portfolio",            weight: 0.55, status: "project",   summary: "Your own allocation, rebalancing rules, decisions log. Boglehead core, satellite trades, BTC/ETH sleeve.", sources: 4, claims: 4, backlinks: 8 },
    { id: "topic-indo-equities",   label: "IDX equities",         weight: 0.42, status: "active",    summary: "Indonesian stocks worth tracking — BBCA, BMRI, TLKM, GOTO. Earnings notes, dividends, governance.", sources: 3, claims: 2, backlinks: 5 },
  ];

  const repos = [
    { id: "repo-openai-codex",      label: "openai/codex",           lab: "OpenAI",     stars: "84.0k", d7: "+1.7k", lang: "Rust",       pushed: "today", topic: "topic-coding-agents" },
    { id: "repo-anthropics-skills", label: "anthropics/skills",      lab: "Anthropic",  stars: "138.0k", d7: "+4.6k", lang: "Python",     pushed: "1d",    topic: "topic-agent-tooling" },
    { id: "repo-anthropics-cc",     label: "anthropics/claude-code", lab: "Anthropic",  stars: "125.1k", d7: "+2.0k", lang: "Shell",      pushed: "today", topic: "topic-coding-agents" },
    { id: "repo-qwen-code",         label: "QwenLM/qwen-code",       lab: "Qwen",       stars: "24.5k", d7: "+1.1k",  lang: "TypeScript", pushed: "today", topic: "topic-coding-agents" },
    { id: "repo-deepseek-deepep",   label: "deepseek-ai/DeepEP",     lab: "DeepSeek",   stars: "9.6k",  d7: "+0.4k",  lang: "Cuda",       pushed: "today", topic: "topic-infra" },
    { id: "repo-moonshot-kimi",     label: "MoonshotAI/kimi-cli",    lab: "Moonshot",   stars: "8.7k",  d7: "+0.6k",  lang: "Python",     pushed: "today", topic: "topic-coding-agents" },
    { id: "repo-internlm-lagent",   label: "InternLM/lagent",        lab: "InternLM",   stars: "2.2k",  d7: "+0.1k",  lang: "Python",     pushed: "1d",    topic: "topic-agent-tooling" },
    { id: "repo-meta-faiss",        label: "facebookresearch/faiss", lab: "Meta",       stars: "40.1k", d7: "+0.2k",  lang: "C++",        pushed: "today", topic: "topic-agent-memory" },
    { id: "repo-apple-mlx",         label: "ml-explore/mlx",         lab: "Apple",      stars: "26.3k", d7: "+0.3k",  lang: "C++",        pushed: "today", topic: "topic-infra" },
  ];

  const labs = [
    { id: "lab-openai",     label: "OpenAI",     country: "US", focus: "agents, sdks, codex", repos: 8 },
    { id: "lab-anthropic",  label: "Anthropic",  country: "US", focus: "claude code, skills, plugins", repos: 8 },
    { id: "lab-qwen",       label: "Qwen",       country: "CN", focus: "agent + omni + kernels", repos: 6 },
    { id: "lab-deepseek",   label: "DeepSeek",   country: "CN", focus: "systems / kernels / FS", repos: 6 },
    { id: "lab-moonshot",   label: "Moonshot",   country: "CN", focus: "CLI agent, SDK, kernels", repos: 6 },
    { id: "lab-tencent",    label: "Tencent Hunyuan", country: "CN", focus: "3D, OCR, embodied", repos: 8 },
    { id: "lab-meta",       label: "FAIR",       country: "US", focus: "vector search, robotics", repos: 8 },
    { id: "lab-deepmind",   label: "Google DeepMind", country: "UK", focus: "physics, optim, gemma", repos: 8 },
  ];

  const claims = [
    { id: "claim-001", text: "Agent/coding workflow is the loudest public signal this week.", confidence: "high",    status: "active",   sourceIds: ["src-goodailist-w20"], topicIds: ["topic-agent-tooling","topic-coding-agents"], created: "2026-05-20" },
    { id: "claim-002", text: "Rendering agent output as HTML beats markdown for dense, queryable artifacts.", confidence: "medium", status: "active",   sourceIds: ["src-thariq-html","src-karpathy-wiki"], topicIds: ["topic-html-artifacts","topic-personal-wiki"], created: "2026-05-19" },
    { id: "claim-003", text: "MCP is becoming the default surface for agent tool use across vendors.", confidence: "medium", status: "active",   sourceIds: ["src-mcp-spec","src-goodailist-w20"], topicIds: ["topic-mcp","topic-agent-tooling"], created: "2026-05-15" },
    { id: "claim-004", text: "China labs lead on agent CLIs and inference kernels; lag on agent UX research.", confidence: "low",    status: "contested", sourceIds: ["src-qwen-code","src-deepep","src-kimi-cli"], topicIds: ["topic-china-frontier"], created: "2026-05-20" },
    { id: "claim-005", text: "Most RAG systems re-discover the same knowledge on every question.", confidence: "high",   status: "active",   sourceIds: ["src-karpathy-wiki","src-reddit-rag","src-brain-personal-wiki"], topicIds: ["topic-agent-memory","topic-personal-wiki"], created: "2026-05-16" },
    { id: "claim-006", text: "Star spikes on goodailist are weak signal; confirm with 7d growth + contributors.", confidence: "medium", status: "active", sourceIds: ["src-goodailist-w20"], topicIds: ["topic-agent-tooling"], created: "2026-05-20" },
    { id: "claim-007", text: "Cytoscape.js is sufficient for ≤500 nodes / 1500 edges per view.", confidence: "high", status: "decided", sourceIds: ["src-brain-personal-wiki"], topicIds: ["topic-personal-wiki"], created: "2026-05-18" },
    { id: "claim-008", text: "Kahneman: System 1 substitutes an easier question when the asked one is hard.", confidence: "high", status: "active", sourceIds: ["src-thinkfast"], topicIds: ["topic-books"], created: "2026-04-22" },

    // ── finance claims ─────────────────────────────────────────
    { id: "claim-fin-1", text: "Fed held in May 2026; dot plot still pencils 2 cuts by year-end.", confidence: "high",   status: "active",   sourceIds: ["src-fed-may26"],                       topicIds: ["topic-markets"],                       created: "2026-05-01" },
    { id: "claim-fin-2", text: "Stablecoin supply hit a new ATH in Q1 2026 — rails matter more than memes.", confidence: "medium", status: "active",   sourceIds: ["src-cg-stablecoins"],            topicIds: ["topic-crypto","topic-markets"],         created: "2026-04-30" },
    { id: "claim-fin-3", text: "A 3-fund portfolio outperforms most active managers over 10y windows after fees.", confidence: "high", status: "decided", sourceIds: ["src-bogle-3fund","src-buffett-2025"], topicIds: ["topic-portfolio"],                   created: "2026-03-01" },
    { id: "claim-fin-4", text: "SPX closed above 200d for 12 weeks running — trend intact, but breadth narrowing.", confidence: "medium", status: "active", sourceIds: ["src-tv-spx"],                  topicIds: ["topic-markets"],                       created: "2026-05-20" },
    { id: "claim-fin-5", text: "BBCA NIM expanded YoY despite rate cuts — pricing power in core deposits.", confidence: "high",   status: "active",   sourceIds: ["src-idx-quarterly"],             topicIds: ["topic-indo-equities","topic-portfolio"],created: "2026-05-05" },
    { id: "claim-fin-6", text: "ETH pectra upgrade reduces L2 fees ~40% — bullish for app-layer activity, neutral for ETH itself.", confidence: "low", status: "contested", sourceIds: ["src-eth-roadmap"], topicIds: ["topic-crypto"],                 created: "2026-05-18" },
    { id: "claim-fin-7", text: "Cashflow-producing assets beat equity-only bets for solo operators.", confidence: "medium", status: "active", sourceIds: ["src-pieter-essay"],                       topicIds: ["topic-portfolio"],                     created: "2026-05-12" },
  ];

  // GRAPH —————————————————————————————————————————————————————————————
  const graph = {
    nodes: [
      // topics (large)
      { id: "topic-agent-tooling",  label: "Agent tooling",  type: "topic", weight: 0.92 },
      { id: "topic-coding-agents",  label: "Coding agents",  type: "topic", weight: 0.85 },
      { id: "topic-china-frontier", label: "China frontier", type: "topic", weight: 0.81 },
      { id: "topic-mcp",            label: "MCP",            type: "topic", weight: 0.78 },
      { id: "topic-agent-memory",   label: "Agent memory",   type: "topic", weight: 0.71 },
      { id: "topic-html-artifacts", label: "HTML artifacts", type: "topic", weight: 0.66 },
      { id: "topic-personal-wiki",  label: "Personal wiki",  type: "topic", weight: 0.62 },
      { id: "topic-infra",          label: "Inference",      type: "topic", weight: 0.58 },
      { id: "topic-evals",          label: "Evals",          type: "topic", weight: 0.54 },
      { id: "topic-books",          label: "Books",          type: "topic", weight: 0.34 },
      // finance topics
      { id: "topic-markets",        label: "Markets",        type: "topic", weight: 0.74 },
      { id: "topic-crypto",         label: "Crypto",         type: "topic", weight: 0.66 },
      { id: "topic-portfolio",      label: "Portfolio",      type: "topic", weight: 0.55 },
      { id: "topic-indo-equities",  label: "IDX equities",   type: "topic", weight: 0.42 },
      // repos
      { id: "repo-openai-codex",     label: "openai/codex",          type: "repo", weight: 0.84 },
      { id: "repo-anthropics-cc",    label: "anthropics/claude-code",type: "repo", weight: 0.82 },
      { id: "repo-anthropics-skills",label: "anthropics/skills",     type: "repo", weight: 0.78 },
      { id: "repo-qwen-code",        label: "QwenLM/qwen-code",      type: "repo", weight: 0.6 },
      { id: "repo-deepseek-deepep",  label: "deepseek-ai/DeepEP",    type: "repo", weight: 0.5 },
      { id: "repo-moonshot-kimi",    label: "MoonshotAI/kimi-cli",   type: "repo", weight: 0.48 },
      { id: "repo-internlm-lagent",  label: "InternLM/lagent",       type: "repo", weight: 0.42 },
      { id: "repo-meta-faiss",       label: "facebookresearch/faiss",type: "repo", weight: 0.55 },
      { id: "repo-apple-mlx",        label: "ml-explore/mlx",        type: "repo", weight: 0.5 },
      // labs
      { id: "lab-openai",    label: "OpenAI",    type: "lab", weight: 0.7 },
      { id: "lab-anthropic", label: "Anthropic", type: "lab", weight: 0.72 },
      { id: "lab-qwen",      label: "Qwen",      type: "lab", weight: 0.55 },
      { id: "lab-deepseek",  label: "DeepSeek",  type: "lab", weight: 0.55 },
      { id: "lab-moonshot",  label: "Moonshot",  type: "lab", weight: 0.5 },
      // claims
      { id: "claim-001", label: "claim·agent workflow", type: "claim", weight: 0.5 },
      { id: "claim-002", label: "claim·HTML > md",      type: "claim", weight: 0.45 },
      { id: "claim-003", label: "claim·MCP default",    type: "claim", weight: 0.45 },
      { id: "claim-005", label: "claim·RAG re-discovers", type: "claim", weight: 0.5 },
      { id: "claim-008", label: "claim·system 1 sub",   type: "claim", weight: 0.3 },
      // finance claims
      { id: "claim-fin-1", label: "claim·Fed hold",       type: "claim", weight: 0.5 },
      { id: "claim-fin-3", label: "claim·3-fund wins",    type: "claim", weight: 0.5 },
      { id: "claim-fin-5", label: "claim·BBCA NIM",       type: "claim", weight: 0.45 },
      // sources
      { id: "src-goodailist-w20", label: "goodailist w20", type: "source", weight: 0.4 },
      { id: "src-karpathy-wiki",  label: "karpathy llm-wiki", type: "source", weight: 0.45 },
      { id: "src-thariq-html",    label: "thariq tweet",   type: "source", weight: 0.3 },
      { id: "src-mcp-spec",       label: "MCP spec",       type: "source", weight: 0.4 },
      { id: "src-thinkfast",      label: "Thinking F&S",   type: "source", weight: 0.3 },
      { id: "src-reddit-rag",     label: "reddit r/LL",    type: "source", weight: 0.25 },
      { id: "src-brain-personal-wiki", label: "brain·wiki",type: "source", weight: 0.4 },
      // finance sources
      { id: "src-buffett-2025",   label: "Berkshire '25",  type: "source", weight: 0.5 },
      { id: "src-bogle-3fund",    label: "Bogleheads 3F",  type: "source", weight: 0.4 },
      { id: "src-tv-spx",         label: "TV · SPX",       type: "source", weight: 0.3 },
      { id: "src-fed-may26",      label: "FOMC may26",     type: "source", weight: 0.4 },
      { id: "src-cg-stablecoins", label: "CG stables Q1",  type: "source", weight: 0.35 },
      { id: "src-idx-quarterly",  label: "BBCA Q1",        type: "source", weight: 0.35 },
      // people
      { id: "person-karpathy", label: "Andrej Karpathy", type: "person", weight: 0.5 },
      { id: "person-thariq",   label: "@trq212",         type: "person", weight: 0.3 },
      { id: "person-buffett",  label: "Warren Buffett",  type: "person", weight: 0.45 },
      { id: "person-levels",   label: "@levelsio",       type: "person", weight: 0.3 },
      { id: "person-kahneman", label: "Daniel Kahneman", type: "person", weight: 0.4 },
      { id: "person-bogleheads", label: "Bogleheads",    type: "person", weight: 0.35 },
      { id: "person-fed",      label: "Federal Reserve", type: "person", weight: 0.45 },
      { id: "person-bca",      label: "Bank Central Asia", type: "person", weight: 0.4 },
      { id: "person-coingecko",label: "CoinGecko",       type: "person", weight: 0.3 },
      { id: "person-ethereum", label: "ethereum.org",    type: "person", weight: 0.3 },

      // ── agents (who created a note/article) ───────────
      { id: "agent-claude",    label: "Claude",          type: "agent",  weight: 0.55 },
      { id: "agent-codex",     label: "Codex",           type: "agent",  weight: 0.45 },
      { id: "agent-loka",      label: "Loka",            type: "agent",  weight: 0.6 },

      // ── orgs / affiliations ───────────────────────────
      { id: "org-openai",      label: "OpenAI",          type: "org",    weight: 0.6 },
      { id: "org-anthropic",   label: "Anthropic",       type: "org",    weight: 0.6 },
      { id: "org-berkshire",   label: "Berkshire Hathaway", type: "org", weight: 0.55 },
      { id: "org-bca",         label: "Bank Central Asia", type: "org",  weight: 0.5 },
      // canvas / brainstorm
      { id: "brain-001", label: "brainstorm·wiki UX", type: "brainstorm", weight: 0.4 },
    ],
    edges: [
      // repos in topics
      { from: "repo-openai-codex",     to: "topic-coding-agents", type: "belongs_to", confidence: "high" },
      { from: "repo-anthropics-cc",    to: "topic-coding-agents", type: "belongs_to", confidence: "high" },
      { from: "repo-qwen-code",        to: "topic-coding-agents", type: "belongs_to", confidence: "high" },
      { from: "repo-moonshot-kimi",    to: "topic-coding-agents", type: "belongs_to", confidence: "high" },
      { from: "repo-anthropics-skills",to: "topic-agent-tooling", type: "belongs_to", confidence: "high" },
      { from: "repo-internlm-lagent",  to: "topic-agent-tooling", type: "belongs_to", confidence: "high" },
      { from: "repo-meta-faiss",       to: "topic-agent-memory",  type: "belongs_to", confidence: "high" },
      { from: "repo-apple-mlx",        to: "topic-infra",         type: "belongs_to", confidence: "high" },
      { from: "repo-deepseek-deepep",  to: "topic-infra",         type: "belongs_to", confidence: "high" },
      // labs to repos
      { from: "lab-openai",     to: "repo-openai-codex",      type: "produced_by", confidence: "high" },
      { from: "lab-anthropic",  to: "repo-anthropics-cc",     type: "produced_by", confidence: "high" },
      { from: "lab-anthropic",  to: "repo-anthropics-skills", type: "produced_by", confidence: "high" },
      { from: "lab-qwen",       to: "repo-qwen-code",         type: "produced_by", confidence: "high" },
      { from: "lab-deepseek",   to: "repo-deepseek-deepep",   type: "produced_by", confidence: "high" },
      { from: "lab-moonshot",   to: "repo-moonshot-kimi",     type: "produced_by", confidence: "high" },
      { from: "lab-qwen",       to: "topic-china-frontier",   type: "belongs_to",  confidence: "high" },
      { from: "lab-deepseek",   to: "topic-china-frontier",   type: "belongs_to",  confidence: "high" },
      { from: "lab-moonshot",   to: "topic-china-frontier",   type: "belongs_to",  confidence: "high" },
      // cross topics
      { from: "topic-coding-agents", to: "topic-agent-tooling", type: "subtopic_of", confidence: "high" },
      { from: "topic-mcp",           to: "topic-agent-tooling", type: "subtopic_of", confidence: "high" },
      { from: "topic-html-artifacts",to: "topic-personal-wiki", type: "supports",    confidence: "high" },
      { from: "topic-agent-memory",  to: "topic-personal-wiki", type: "supports",    confidence: "medium" },
      // claims
      { from: "claim-001", to: "topic-agent-tooling", type: "supports", confidence: "high" },
      { from: "claim-002", to: "topic-html-artifacts", type: "supports", confidence: "medium" },
      { from: "claim-003", to: "topic-mcp",           type: "supports", confidence: "medium" },
      { from: "claim-005", to: "topic-agent-memory",  type: "supports", confidence: "high" },
      { from: "claim-005", to: "topic-personal-wiki", type: "supports", confidence: "high" },
      { from: "claim-008", to: "topic-books",         type: "supports", confidence: "high" },
      // sources to claims
      { from: "src-goodailist-w20", to: "claim-001", type: "cites", confidence: "high" },
      { from: "src-karpathy-wiki",  to: "claim-002", type: "cites", confidence: "high" },
      { from: "src-thariq-html",    to: "claim-002", type: "cites", confidence: "medium" },
      { from: "src-mcp-spec",       to: "claim-003", type: "cites", confidence: "high" },
      { from: "src-karpathy-wiki",  to: "claim-005", type: "cites", confidence: "high" },
      { from: "src-reddit-rag",     to: "claim-005", type: "cites", confidence: "low" },
      { from: "src-thinkfast",      to: "claim-008", type: "cites", confidence: "high" },
      // people
      { from: "person-karpathy", to: "src-karpathy-wiki", type: "produced_by", confidence: "high" },
      { from: "person-thariq",   to: "src-thariq-html",   type: "produced_by", confidence: "high" },
      // brainstorm
      { from: "brain-001",       to: "topic-personal-wiki", type: "led_to", confidence: "high" },
      { from: "brain-001",       to: "src-brain-personal-wiki", type: "derived_from", confidence: "high" },
      // contradiction
      { from: "claim-002", to: "claim-005", type: "similar_to", confidence: "low" },

      // ── finance edges ─────────────────────────────────────
      { from: "topic-crypto",     to: "topic-markets",    type: "subtopic_of", confidence: "high" },
      { from: "topic-portfolio",  to: "topic-markets",    type: "supports",    confidence: "high" },
      { from: "topic-indo-equities", to: "topic-portfolio", type: "supports",  confidence: "medium" },
      { from: "topic-indo-equities", to: "topic-markets",   type: "subtopic_of", confidence: "high" },

      { from: "claim-fin-1", to: "topic-markets",   type: "supports", confidence: "high" },
      { from: "claim-fin-3", to: "topic-portfolio", type: "supports", confidence: "high" },
      { from: "claim-fin-5", to: "topic-indo-equities", type: "supports", confidence: "high" },
      { from: "claim-fin-5", to: "topic-portfolio", type: "supports", confidence: "medium" },

      { from: "src-fed-may26",      to: "claim-fin-1", type: "cites", confidence: "high" },
      { from: "src-buffett-2025",   to: "claim-fin-3", type: "cites", confidence: "high" },
      { from: "src-bogle-3fund",    to: "claim-fin-3", type: "cites", confidence: "high" },
      { from: "src-tv-spx",         to: "topic-markets", type: "mentions", confidence: "medium" },
      { from: "src-cg-stablecoins", to: "topic-crypto",  type: "mentions", confidence: "medium" },
      { from: "src-idx-quarterly",  to: "claim-fin-5",   type: "cites",    confidence: "high" },

      { from: "person-buffett", to: "src-buffett-2025", type: "produced_by", confidence: "high" },
      { from: "person-levels",  to: "topic-portfolio",  type: "mentions",    confidence: "medium" },

      // ── more people → their sources / topics ─────────────
      { from: "person-kahneman",   to: "src-thinkfast",      type: "authored",  confidence: "high" },
      { from: "person-bogleheads", to: "src-bogle-3fund",    type: "authored",  confidence: "high" },
      { from: "person-fed",        to: "src-fed-may26",      type: "published", confidence: "high" },
      { from: "person-bca",        to: "src-idx-quarterly",  type: "published", confidence: "high" },
      { from: "person-coingecko",  to: "src-cg-stablecoins", type: "published", confidence: "high" },
      { from: "person-ethereum",   to: "src-eth-roadmap",    type: "published", confidence: "high" },

      { from: "person-karpathy",   to: "topic-coding-agents", type: "mentions", confidence: "high" },
      { from: "person-thariq",     to: "topic-html-artifacts",type: "mentions", confidence: "high" },
      { from: "person-buffett",    to: "topic-portfolio",     type: "mentions", confidence: "high" },
      { from: "person-bogleheads", to: "topic-portfolio",     type: "mentions", confidence: "high" },
      { from: "person-fed",        to: "topic-markets",       type: "mentions", confidence: "high" },
      { from: "person-bca",        to: "topic-indo-equities", type: "mentions", confidence: "high" },
      { from: "person-coingecko",  to: "topic-crypto",        type: "mentions", confidence: "medium" },
      { from: "person-ethereum",   to: "topic-crypto",        type: "mentions", confidence: "high" },
      { from: "person-kahneman",   to: "topic-books",         type: "mentions", confidence: "high" },

      // ── agents → articles they created ─────────────────
      { from: "agent-codex",   to: "ib-010",     type: "created", confidence: "high" },
      { from: "agent-claude",  to: "ib-011",     type: "created", confidence: "medium" },
      { from: "agent-loka",    to: "ib-fin-5",   type: "created", confidence: "high" },
      { from: "agent-loka",    to: "ib-004",     type: "created", confidence: "high" },
      { from: "agent-codex",   to: "topic-personal-wiki", type: "mentions", confidence: "high" },
      { from: "agent-claude",  to: "topic-agent-memory",  type: "mentions", confidence: "high" },
      { from: "agent-loka",    to: "topic-portfolio",     type: "mentions", confidence: "high" },
      { from: "agent-loka",    to: "topic-personal-wiki", type: "mentions", confidence: "medium" },

      // ── people → orgs (affiliated_with) ──────────────
      { from: "person-karpathy", to: "org-openai",    type: "affiliated_with", confidence: "high" },
      { from: "person-buffett",  to: "org-berkshire", type: "affiliated_with", confidence: "high" },
      { from: "person-bca",      to: "org-bca",       type: "affiliated_with", confidence: "high" },

      // ── orgs → articles they published ───────────────
      { from: "org-berkshire",   to: "src-buffett-2025", type: "published", confidence: "high" },
      { from: "org-bca",         to: "src-idx-quarterly", type: "published", confidence: "high" },
      { from: "org-anthropic",   to: "src-skills-anth", type: "published", confidence: "high" },
      { from: "org-openai",      to: "src-codex-readme", type: "published", confidence: "high" },
    ],
  };

  const review = [
    { id: "rv-001", kind: "duplicate",     subject: "topic·Coding agents  ≈  topic·CLI agents",       confidence: "high",    age: "2d",  proposedBy: "agent·codex" },
    { id: "rv-002", kind: "contradiction", subject: "claim·004 vs lagent + xtuner activity",          confidence: "medium",  age: "5h",  proposedBy: "agent·claude" },
    { id: "rv-003", kind: "weak-edge",     subject: "edge claim-002 → claim-005 (similar_to, low)",   confidence: "low",     age: "1d",  proposedBy: "lint" },
    { id: "rv-004", kind: "stale-claim",   subject: "claim-006 — source older than 14d",              confidence: "low",     age: "14d", proposedBy: "lint" },
    { id: "rv-005", kind: "unprocessed",   subject: "brainstorm·wiki UX → 5 candidate tasks",         confidence: "medium",  age: "1h",  proposedBy: "agent·codex" },
    { id: "rv-006", kind: "missing-source",subject: "claim·005 only cites blog, no primary research", confidence: "medium",  age: "3d",  proposedBy: "lint" },
    { id: "rv-007", kind: "risky-merge",   subject: "lab·DeepMind ⇢ lab·Google Research",             confidence: "high",    age: "6d",  proposedBy: "you" },
  ];

  const reports = [
    { id: "rep-w20", title: "Weekly — 2026-W20", date: "2026-05-17", sources: 38, claims: 6, newEdges: 41, summary: "Coding agents kept compounding. Karpathy nanochat still trending. DeepEP shipped FP8 path." },
    { id: "rep-w19", title: "Weekly — 2026-W19", date: "2026-05-10", sources: 29, claims: 4, newEdges: 33, summary: "MCP ecosystem cleanup. Anthropic skills repo crosses 100k stars." },
    { id: "rep-china-radar-04", title: "China frontier radar — Apr 2026", date: "2026-05-01", sources: 22, claims: 7, newEdges: 28, summary: "Qwen3.6 drop. Hunyuan world models. Moonshot kimi-cli ships agent SDK." },
    { id: "rep-personal-wiki", title: "Project — Personal wiki spec", date: "2026-05-20", sources: 4, claims: 5, newEdges: 12, summary: "Architecture v0 nailed. Phases 1–4 listed. Cytoscape locked for v1." },
    { id: "rep-macro-may", title: "Macro brief — May 2026", date: "2026-05-15", sources: 11, claims: 4, newEdges: 18, summary: "Fed holds; dot plot still 2 cuts. SPX breadth narrowing. Stablecoin supply at ATH." },
    { id: "rep-portfolio-q1", title: "Portfolio review — Q1 2026", date: "2026-04-05", sources: 8, claims: 6, newEdges: 14, summary: "Trimmed ETH 2%→1%. BBCA added on Q1 NIM print. Core 3-fund untouched." },
  ];

  const signals = [
    { id: "sg-1", text: "SPX +0.6% · 12w above 200d",            delta: "↑", kind: "fin" },
    { id: "sg-2", text: "BTC 71,820 · −1.2% 24h",                delta: "↓", kind: "fin" },
    { id: "sg-3", text: "+18.2k 7d  mattpocock/skills",          delta: "↑", kind: "ai" },
    { id: "sg-4", text: "BBCA Q1 NIM expanded YoY",              delta: "↑", kind: "fin" },
    { id: "sg-5", text: "+10.7k 7d  obra/superpowers",           delta: "↑", kind: "ai" },
    { id: "sg-6", text: "DXY softened 0.3 ahead of FOMC minutes",delta: "•", kind: "fin" },
    { id: "sg-7", text: "DeepEP FP8 GEMM merged main",           delta: "•", kind: "ai" },
    { id: "sg-8", text: "Stablecoin supply at new ATH (Q1)",     delta: "↑", kind: "fin" },
  ];

  const openQuestions = [
    "Should brainstorms auto-create tasks, or wait for review?",
    "Is BBCA still cheap after the Q1 NIM print, or fairly valued?",
    "Where to put the next 5% — IDX dividend names, BTC, or VWRA?",
    "How to compute confidence for an edge added by two agents?",
    "What does a 'stale topic' look like for Books or Portfolio?",
  ];

  const canvas = {
    boards: [
      { id: "cv-arch", title: "personal-wiki·architecture", updated: "2026-05-20", cards: 14, edges: 18, cover: "arch" },
      { id: "cv-china", title: "china-frontier·map",        updated: "2026-05-19", cards: 22, edges: 31, cover: "china" },
      { id: "cv-thinking", title: "thinking-loop·brainstorm", updated: "2026-05-18", cards: 9, edges: 11, cover: "loop" },
    ],
  };

  // ── BODIES — actual article/note content rendered on entity pages ──
  // Use [[Title]] for inline wikilinks (matched against entry titles).
  const bodies = {
    "src-buffett-2025": `Berkshire's 2025 letter reads like a quiet sermon on patience. Operating earnings reached a record again, but Buffett spends most of the pages on what he won't do: chase momentum, time the macro, or buy back stock above intrinsic value.

The strongest section is on insurance float — still the unfair advantage. GEICO improved its loss ratio; reinsurance is harder; the railroad is steady but unremarkable.

He repeats his core line, almost verbatim from prior letters: "Time is the friend of the wonderful business, the enemy of the mediocre." A useful reminder for [[Portfolio]] decisions made at 1am with a chart open.`,

    "src-bogle-3fund": `The classic three-fund portfolio is total US stock + total international stock + total bond market. No clever tilts, no factor bets, no leverage. The argument is that low cost, broad diversification, and a single rebalancing rule beat ~80% of active managers over 10-year windows, after fees.

The most underrated property is psychological: there's nothing to fiddle with. You buy, rebalance once a year, and go live your life. The wiki could use more of this kind of "boring works" claim — see [[claim·3-fund wins]].`,

    "src-tv-spx": `Saved chart. SPX closed the week above its 200-day weekly moving average for the 12th week in a row. Breadth is the worry — fewer names are participating in each new high. Defensive sectors lagging, mega-cap tech carrying.

Not a sell signal on its own. Worth watching against [[claim·Fed hold]] — if cuts get pushed out again, the narrowness shows up first.`,

    "src-fed-may26": `FOMC held in May 2026, as expected. Dot plot still pencils two cuts by year-end. Statement language softened on labor market — "moderating" replaced "tight." Press conference reiterated data-dependence; no commitment.

Implication for [[Markets]]: short-end yields drifted lower into the close; the curve steepened modestly. Watch shelter and core services in next CPI.`,

    "src-idx-quarterly": `BBCA Q1 2026 net income beat consensus by ~3%. NIM expanded YoY despite a lower BI rate — pricing power in core CASA deposits keeps showing up.

Asset quality stable; NPL ratio flat QoQ. CIR ticked up on digital investment but still best-in-class.

This is a good place to file [[claim·BBCA NIM]] — and a reason to keep BBCA as a core holding in [[Portfolio]] rather than trading the cycle.`,

    "src-thinkfast": `Chapter 3 — "The Lazy Controller." Kahneman's argument: when System 2 is taxed, System 1 runs unchecked, and we substitute easier questions for the hard ones we were actually asked.

For [[Portfolio]] thinking specifically: "is this stock a good investment?" gets quietly swapped for "do I like this company?" — same shape, very different answer.

The chapter is short but the implication is large: most of what we call instinct is the residue of a substitution we didn't notice.`,

    "src-karpathy-wiki": `Karpathy's pattern: stop having the LLM re-read your raw documents on every question. Compile knowledge once, into a structured, interlinked wiki. Treat the wiki like a binary, the sources like source code.

Three operations:
1. **Ingest** — drop a source, LLM reads + updates 10-15 pages.
2. **Query** — ask a question, LLM reads the wiki, not the raw docs.
3. **Lint** — periodically audit for orphans, contradictions, missing links.

The line that captures it: "Obsidian is the IDE, the LLM is the programmer, the wiki is the codebase." Loka is the same pattern but the wiki is HTML, not markdown.`,

    "src-pieter-essay": `Pieter's argument is short: equity is a story you tell, cashflow is a number you wire. For solo operators, optimizing for monthly cashflow beats optimizing for a 10-year exit by a wide margin.

Counterpoint worth keeping: this only works at his scale. For [[Portfolio]] allocation that's meant to compound for 30 years, the math flips back toward equity.`,

    // notes / decisions
    "ib-fin-5": `Trimming ETH allocation from 2% → 1% of the portfolio.

Reasons: (1) pectra didn't move the supply curve, (2) BTC is doing the same job with simpler risks, (3) the satellite sleeve has crept above my 5% cap.

Not a thesis change. Just rebalancing. See [[claim·ETH pectra]].`,

    "ib-010": `Decision: use Cytoscape.js for graph v1, not D3 or vis-network.

Reasons: well-documented, handles ≤500 nodes / 1500 edges per view comfortably, headless layout via worker means I can precompute positions for big saved views. D3 would be more flexible but I'd rebuild three things Cytoscape already gives me.

See [[claim·3-fund wins]] — same principle: pick the boring thing that works.`,

    "ib-011": `Quote from Kahneman, ch.3: "When faced with a difficult question, we often answer an easier one instead, usually without noticing the substitution."

The portfolio version: instead of "is this position still right for my plan?" I quietly answer "is this position green today?" Same shape, very different question.`,

    // ── agents (origin of notes/articles) ─────────────────────
    "agent-claude": `Claude — Anthropic's assistant. In this wiki, Claude is the agent behind chat sessions, longer-form summaries, and most "decision" notes that come out of a back-and-forth conversation.

Open any note tagged with the Claude agent to see what it captured. Most of these are research dives and reasoning chains worth referencing later.`,

    "agent-codex": `Codex — the coding assistant. In this wiki, Codex creates notes that come out of coding sessions, design decisions, and engineering trade-offs (e.g. picking [[Personal wiki]] stack choices).

If a note feels technical or refers to a specific repo, library, or design decision — it probably came from a Codex session.`,

    "agent-loka": `Loka — personal agent. The one that maintains this wiki itself: ingesting bookmarks, deduping entities, suggesting links, running the nightly lint.

If a note has no obvious author, Loka created it from a passive capture (URL save, bookmark, screenshot).`,

    // ── orgs ─────────────────────────────────────────────────
    "org-openai": `OpenAI — the org. People you track from here: [[Andrej Karpathy]] (alumnus, prolific writer on agents and AI education).

Repos and products published by OpenAI mostly land in [[Agent tooling]] and [[Coding agents]].`,

    "org-anthropic": `Anthropic — the org behind Claude and the Model Context Protocol. Notes from this org are usually about [[MCP]], agent skills, or Claude's behaviour.`,

    "org-berkshire": `Berkshire Hathaway — Warren Buffett's company. The annual letter is the main thing you track here.`,

    "org-bca": `Bank Central Asia — IDX large-cap bank. Filed under [[IDX equities]] and [[Portfolio]]. The Q1 NIM print is the most-cited datapoint.`,
  };

  return { generatedAt: now, sources, inbox, topics, repos, labs, claims, graph, review, reports, signals, openQuestions, canvas, bodies };
})();
