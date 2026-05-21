"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import type Cytoscape from "cytoscape";
import { useEffect, useMemo, useRef, useState } from "react";

type EntityKind = string;

type WikiPage = {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  body: string;
  summary?: string;
  status: string;
  sourceUrl?: string;
  sourceType?: string;
  trust?: string;
  createdByAgentId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  metadata: Record<string, unknown>;
};

type WikiLink = {
  id: string;
  fromPageId: string;
  toPageId: string;
  origin: string;
  sourceText?: string;
  createdByAgentId?: string;
  createdAt: string;
};

type WikiEntity = {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

type EntityMention = {
  id: string;
  pageId: string;
  entityId: string;
  sourceText: string;
  createdAt: string;
};

type EntityLink = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  origin: string;
  sourcePageId?: string;
  createdAt: string;
};

type GraphNode = {
  id: string;
  kind: "page" | "entity" | "agent" | "resource";
  subtype?: string;
  title: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  kind: string;
  fromNodeId: string;
  toNodeId: string;
  origin: string;
  sourcePageId?: string;
  createdAt?: string;
  metadata: Record<string, unknown>;
};

type KnowledgeGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  pages: WikiPage[];
  pageLinks: WikiLink[];
  entities: WikiEntity[];
  entityLinks: EntityLink[];
  mentions: EntityMention[];
};

type ViewState = { mode: "home" } | { mode: "graph" } | { mode: "entry"; id: string };

type SearchItem = {
  id: string;
  kind: EntityKind | "cmd";
  title: string;
  hint: string;
};

type BreadcrumbItem = {
  label: string;
  action?: () => void;
};

type OutlineItem = {
  id: string;
  level: 2 | 3;
  title: string;
};

type ProseBlock =
  | {
      kind: "heading";
      id: string;
      level: 2 | 3 | 4 | 5 | 6;
      text: string;
    }
  | {
      kind: "paragraph";
      text: string;
    };

type ParsedPageBody = {
  blocks: ProseBlock[];
  outline: OutlineItem[];
};

const apiBase = process.env.NEXT_PUBLIC_PERSONAL_WIKI_API_URL ?? "/wiki-api";

export default function Home() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [pageLinks, setPageLinks] = useState<WikiLink[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [view, setView] = useState<ViewState>({ mode: "home" });
  const [graphFocusId, setGraphFocusId] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const pageById = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);
  const pageByTitle = useMemo(
    () => new Map(pages.map((page) => [page.title.toLowerCase(), page])),
    [pages]
  );
  const nodeById = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const connectionStatus = loading ? "" : error ? "offline" : "online";
  const activePage = view.mode === "entry" ? pageById.get(view.id) : undefined;
  const visibleSearchItems = useMemo(
    () => filterSearchItems(pages, search, graphEdges.length),
    [pages, search, graphEdges.length]
  );
  const sidebarGroups = useMemo(
    () => groupPagesByKind(pages.filter((page) => matchesFilter(page, sidebarFilter))),
    [pages, sidebarFilter]
  );

  useEffect(() => {
    void refreshWiki();
  }, []);

  async function refreshWiki() {
    setLoading(true);
    setError("");

    try {
      const [pagesResponse, graphResponse] = await Promise.all([
        fetch(`${apiBase}/api/pages?limit=500`, { cache: "no-store" }),
        fetch(`${apiBase}/api/graph`, { cache: "no-store" })
      ]);

      if (!pagesResponse.ok) throw new Error(`pages request failed: ${pagesResponse.status}`);
      if (!graphResponse.ok) throw new Error(`graph request failed: ${graphResponse.status}`);

      const pagesPayload = (await pagesResponse.json()) as { pages: WikiPage[] };
      const graphPayload = (await graphResponse.json()) as KnowledgeGraph;
      const nextPages = pagesPayload.pages;
      const nextNodes = graphPayload.nodes ?? [];
      const nextEdges = graphPayload.edges ?? [];
      const nextPageLinks = graphPayload.pageLinks ?? [];

      setPages(nextPages);
      setGraphNodes(nextNodes);
      setGraphEdges(nextEdges);
      setPageLinks(nextPageLinks);
      setGraphFocusId((current) => {
        if (current && nextNodes.some((node) => node.id === current)) return current;
        return nextNodes[0]?.id ?? "";
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "failed to load wiki");
    } finally {
      setLoading(false);
    }
  }

  function openPage(id: string) {
    const page = pageById.get(id);
    if (!page) return;
    setView({ mode: "entry", id });
    setGraphFocusId(pageNodeId(page.id));
    closeSearch();
  }

  function openHome() {
    setView({ mode: "home" });
    closeSearch();
  }

  function openGraph(focusId = graphFocusId || graphNodes[0]?.id || "") {
    if (graphNodes.length === 0) return;
    setGraphFocusId(focusId);
    setView({ mode: "graph" });
    closeSearch();
  }

  function openGraphNode(id: string) {
    const node = nodeById.get(id);
    if (!node) return;
    setGraphFocusId(id);

    const pageId = metadataPageId(node);
    if (pageId && pageById.has(pageId)) {
      openPage(pageId);
      return;
    }

    const page = pageByTitle.get(node.title.toLowerCase());
    if (page) {
      openPage(page.id);
      return;
    }

    setView({ mode: "graph" });
    closeSearch();
  }

  function closeSearch() {
    setSearch("");
    setSearchOpen(false);
    setSearchIndex(0);
  }

  function pickSearchItem(item: SearchItem | undefined) {
    if (!item) return;

    if (item.id === "home") {
      openHome();
      return;
    }

    if (item.id === "graph") {
      openGraph();
      return;
    }

    openPage(item.id);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchIndex((current) => Math.min(current + 1, visibleSearchItems.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      pickSearchItem(visibleSearchItems[searchIndex]);
      return;
    }

    if (event.key === "Escape") {
      closeSearch();
    }
  }

  const breadcrumb = getBreadcrumb({
    view,
    activePage,
    graphNodes,
    graphFocusId,
    nodeById,
    openHome,
    openGraph
  });
  const pinnedPages = pages.slice(0, 5);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={openHome}>
          <span className="brand__mark" />
          <span>Personal wiki</span>
        </button>

        <div className="breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="breadcrumb__item">
              {index > 0 ? <span className="breadcrumb__sep">/</span> : null}
              {item.action ? (
                <button type="button" onClick={item.action}>
                  {item.label}
                </button>
              ) : (
                <span className="breadcrumb__current">{item.label}</span>
              )}
            </span>
          ))}
        </div>

        <div className="search" onBlur={() => setSearchOpen(false)}>
          <span className="search__icon">/</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
              setSearchIndex(0);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search pages"
            aria-label="Search pages"
          />
          {searchOpen ? (
            <div className="search__results">
              {visibleSearchItems.map((item, index) => (
                <button
                  key={item.id}
                  className={`search__result ${index === searchIndex ? "is-selected" : ""}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pickSearchItem(item);
                  }}
                >
                  <KindDot kind={item.kind} />
                  <span className="search__kind">{item.kind}</span>
                  <span className="search__title">{item.title}</span>
                  <span className="search__hint">{item.hint}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className={`topbar__button ${view.mode === "graph" ? "is-active" : ""}`}
          type="button"
          disabled={graphNodes.length === 0}
          onClick={() => openGraph()}
          aria-label="Open graph"
          title="Graph"
        >
          ✺
        </button>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar__filter">
            <input
              value={sidebarFilter}
              onChange={(event) => setSidebarFilter(event.target.value)}
              placeholder="filter pages..."
              aria-label="Filter pages"
            />
          </div>

          <nav className="tree" aria-label="Wiki pages">
            {pinnedPages.length > 0 ? (
              <>
                <div className="tree__section">Recent</div>
                <div className="tree__group tree__group--open">
                  {pinnedPages.map((page) => (
                    <TreeItem
                      key={page.id}
                      page={page}
                      active={activePage?.id === page.id}
                      onClick={() => openPage(page.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="tree__placeholder">
                <span>{loading ? "loading..." : "pages appear here"}</span>
              </div>
            )}

            {sidebarGroups.length > 0 ? <div className="tree__section">Pages</div> : null}
            {sidebarGroups.map((group) => {
              const isOpen = groupOpen[group.kind] ?? true;
              return (
                <div key={group.kind} className="tree__group">
                  <button
                    className="tree__group-head"
                    type="button"
                    onClick={() =>
                      setGroupOpen((current) => ({
                        ...current,
                        [group.kind]: !(current[group.kind] ?? true)
                      }))
                    }
                  >
                    <span className="tree__caret">{isOpen ? "v" : ">"}</span>
                    <span>{group.label}</span>
                    <span className="tree__count">{group.pages.length}</span>
                  </button>

                  {isOpen ? (
                    <div>
                      {group.pages.map((page) => (
                        <TreeItem
                          key={page.id}
                          page={page}
                          active={activePage?.id === page.id}
                          onClick={() => openPage(page.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="main">
          {view.mode === "home" ? (
            <HomeView pages={pages} loading={loading} error={error} openPage={openPage} />
          ) : null}

          {view.mode === "graph" ? (
            <GraphView
              nodes={graphNodes}
              edges={graphEdges}
              nodeById={nodeById}
              focusId={graphFocusId}
              setFocusId={setGraphFocusId}
              openGraphNode={openGraphNode}
            />
          ) : null}

          {view.mode === "entry" && activePage ? (
            <EntityPage
              page={activePage}
              pages={pages}
              links={pageLinks}
              pageByTitle={pageByTitle}
              openPage={openPage}
              openGraph={openGraph}
            />
          ) : null}
        </main>
      </div>

      <footer className="statusbar">
        <span>{pages.length} pages</span>
        <span>{graphNodes.length} nodes</span>
        <span>{graphEdges.length} edges</span>
        {connectionStatus ? (
          <span className={`statusbar__connection statusbar__connection--${connectionStatus}`}>
            {connectionStatus}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

function TreeItem({
  page,
  active,
  onClick
}: {
  page: WikiPage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`tree__item ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <KindDot kind={page.kind} />
      <span>{page.title}</span>
    </button>
  );
}

function HomeView({
  pages,
  loading,
  error,
  openPage
}: {
  pages: WikiPage[];
  loading: boolean;
  error: string;
  openPage: (id: string) => void;
}) {
  const recentPages = pages.slice(0, 8);
  const updatedAt = pages[0]?.updatedAt;
  const showEmpty = loading || error || pages.length === 0;
  const emptyTitle = loading ? "Opening wiki" : error ? "Offline" : "Start with one page";
  const emptyCopy = loading
    ? "Checking the workspace."
    : error
      ? "The workspace service is not reachable."
      : "Pages, notes, sources, and entities will appear as the wiki grows.";
  const updatedLabel = updatedAt ? formatDate(updatedAt) : "none";

  return (
    <section className="home-view">
      <div className="home-view__date">{loading ? "loading" : "personal wiki"}</div>
      <div className="home-view__header">
        <div>
          <h1>Recent pages</h1>
          <p className="home-view__lede">Latest changes across the wiki.</p>
        </div>
        <dl className="home-view__stats">
          <div>
            <dt>pages</dt>
            <dd>{pages.length}</dd>
          </div>
          <div>
            <dt>updated</dt>
            <dd>{updatedLabel}</dd>
          </div>
        </dl>
      </div>

      {showEmpty ? (
        <div className="empty-state">
          <div className="empty-state__visual" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="empty-state__body">
            <h2>{emptyTitle}</h2>
            <p>{emptyCopy}</p>
            {error ? (
              <div className="empty-state__actions">
                <code>pnpm dev:server</code>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {pages.length > 0 ? (
        <section className="home-block home-block--recent">
          <div className="recent-list">
            <div className="recent-list__head">
              <span>page</span>
              <span>agent</span>
              <span>updated</span>
            </div>
            {recentPages.map((page) => (
              <button
                key={page.id}
                className="recent-row"
                type="button"
                onClick={() => openPage(page.id)}
              >
                <span className="recent-row__page">
                  <KindDot kind={page.kind} />
                  <span>
                    <strong>{page.title}</strong>
                    <small>{page.kind}</small>
                  </span>
                </span>
                <span className="recent-row__agent">{page.createdByAgentId ?? "manual"}</span>
                <span className="recent-row__date">{formatDate(page.updatedAt)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function EntityPage({
  page,
  pages,
  links,
  pageByTitle,
  openPage,
  openGraph
}: {
  page: WikiPage;
  pages: WikiPage[];
  links: WikiLink[];
  pageByTitle: Map<string, WikiPage>;
  openPage: (id: string) => void;
  openGraph: (focusId?: string) => void;
}) {
  const relatedPages = getRelatedPages(page.id, pages, links);
  const linkCount = links.filter(
    (link) => link.fromPageId === page.id || link.toPageId === page.id
  ).length;
  const parsedBody = useMemo(() => parsePageBody(page.body, page.title), [page.body, page.title]);
  const showOutline = parsedBody.outline.length >= 2;
  const [activeOutlineId, setActiveOutlineId] = useState(parsedBody.outline[0]?.id ?? "");

  useEffect(() => {
    if (parsedBody.outline.length === 0) {
      setActiveOutlineId("");
      return;
    }

    setActiveOutlineId((current) =>
      parsedBody.outline.some((item) => item.id === current)
        ? current
        : (parsedBody.outline[0]?.id ?? "")
    );

    const main = document.querySelector<HTMLElement>(".main");
    const mainOverflow = main ? window.getComputedStyle(main).overflowY : "";
    const root = main && mainOverflow !== "visible" ? main : null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

        const topEntry = visibleEntries[0];
        if (topEntry) setActiveOutlineId(topEntry.target.id);
      },
      { root, rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] }
    );

    for (const item of parsedBody.outline) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [page.id, parsedBody.outline]);

  return (
    <article className={`entity-page ${showOutline ? "entity-page--with-outline" : ""}`}>
      <div className="entity-page__content">
        <header className="entity-page__header">
          <div className="entity-page__topline">
            <div className="entity-page__kind">
              <KindDot kind={page.kind} />
              <span>
                {page.kind}
                {page.sourceType ? ` - ${page.sourceType}` : ""}
              </span>
            </div>
            <button
              className="entity-page__graph-action"
              type="button"
              onClick={() => openGraph(pageNodeId(page.id))}
              title="Open this page in the graph"
              aria-label={`View ${page.title} neighborhood`}
            >
              ✺
            </button>
          </div>
          <h1>{page.title}</h1>
          {page.summary ? <p className="entity-page__lede">{page.summary}</p> : null}
          {page.sourceUrl ? (
            <a className="entity-page__url" href={page.sourceUrl} target="_blank" rel="noreferrer">
              {page.sourceUrl}
            </a>
          ) : null}
          <MetadataRow page={page} linkCount={linkCount} />
        </header>

        {showOutline ? (
          <PageOutline
            items={parsedBody.outline}
            activeId={activeOutlineId}
            setActiveId={setActiveOutlineId}
          />
        ) : null}

        {page.body ? (
          <section className="entity-section entity-section--prose">
            <WikiProse blocks={parsedBody.blocks} pageByTitle={pageByTitle} openPage={openPage} />
          </section>
        ) : (
          <section className="entity-section">
            <p className="empty-copy">No body.</p>
          </section>
        )}

        {relatedPages.length > 0 ? (
          <section className="entity-section">
            <div className="section-title">
              <h2>related</h2>
              <span>{relatedPages.length}</span>
            </div>
            <div className="card-list">
              {relatedPages.map((relatedPage) => (
                <button
                  key={relatedPage.id}
                  className="card-row"
                  type="button"
                  onClick={() => openPage(relatedPage.id)}
                >
                  <span>
                    <strong>{relatedPage.title}</strong>
                    <small>{relatedPage.sourceType ?? relatedPage.kind}</small>
                  </span>
                  <span>{formatDate(relatedPage.updatedAt)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showOutline ? (
        <PageOutline
          items={parsedBody.outline}
          activeId={activeOutlineId}
          setActiveId={setActiveOutlineId}
          variant="rail"
        />
      ) : null}
    </article>
  );
}

function MetadataRow({ page, linkCount }: { page: WikiPage; linkCount: number }) {
  const items: Array<[string, string]> = [];

  if (page.createdByAgentId) items.push(["agent", page.createdByAgentId]);
  items.push(["updated", formatDate(page.updatedAt)]);
  if (page.trust) items.push(["trust", page.trust]);
  if (linkCount > 0) items.push(["links", String(linkCount)]);

  return (
    <dl className="metadata">
      {items.map(([key, value]) => (
        <div key={`${key}-${value}`}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WikiProse({
  blocks,
  pageByTitle,
  openPage
}: {
  blocks: ProseBlock[];
  pageByTitle: Map<string, WikiPage>;
  openPage: (id: string) => void;
}) {
  return (
    <div className="prose">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          <ProseHeading key={block.id} block={block} />
        ) : (
          <p key={`${block.text.slice(0, 24)}-${index}`}>
            {renderInline(block.text, pageByTitle, openPage)}
          </p>
        )
      )}
    </div>
  );
}

function ProseHeading({ block }: { block: Extract<ProseBlock, { kind: "heading" }> }) {
  const content = (
    <a href={`#${block.id}`} aria-label={`Link to ${block.text}`}>
      {block.text}
    </a>
  );

  if (block.level === 2) return <h2 id={block.id}>{content}</h2>;
  if (block.level === 3) return <h3 id={block.id}>{content}</h3>;
  if (block.level === 4) return <h4 id={block.id}>{content}</h4>;
  if (block.level === 5) return <h5 id={block.id}>{content}</h5>;
  return <h6 id={block.id}>{content}</h6>;
}

function PageOutline({
  items,
  activeId,
  setActiveId,
  variant = "inline"
}: {
  items: OutlineItem[];
  activeId: string;
  setActiveId: (id: string) => void;
  variant?: "inline" | "rail";
}) {
  return (
    <nav className={`page-outline page-outline--${variant}`} aria-label="Page outline">
      <div className="page-outline__title">outline</div>
      <div className="page-outline__items">
        {items.map((item) => (
          <a
            key={item.id}
            className={`page-outline__item page-outline__item--h${item.level} ${
              activeId === item.id ? "is-active" : ""
            }`}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              setActiveId(item.id);
              document.getElementById(item.id)?.scrollIntoView({
                block: "start",
                behavior: "smooth"
              });
              window.history.replaceState(
                null,
                "",
                `${window.location.pathname}${window.location.search}#${item.id}`
              );
            }}
          >
            {item.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

function parsePageBody(body: string, pageTitle: string): ParsedPageBody {
  const blocks: ProseBlock[] = [];
  const outline: OutlineItem[] = [];
  const usedIds = new Map<string, number>();

  for (const rawBlock of body.split(/\n\n+/)) {
    const text = rawBlock.trim();
    if (!text) continue;

    const heading = parseMarkdownHeading(text);
    if (heading) {
      if (
        heading.level === 1 &&
        normalizeHeadingText(heading.title) === normalizeHeadingText(pageTitle)
      ) {
        continue;
      }

      const level = normalizeRenderedHeadingLevel(heading.level);
      const id = uniqueHeadingId(heading.title, usedIds);
      blocks.push({ kind: "heading", id, level, text: heading.title });

      if (level === 2 || level === 3) {
        outline.push({ id, level, title: heading.title });
      }
      continue;
    }

    blocks.push({ kind: "paragraph", text });
  }

  return { blocks, outline };
}

function parseMarkdownHeading(text: string): { level: number; title: string } | null {
  if (text.includes("\n")) return null;
  const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(text);
  if (!match) return null;

  const marker = match[1] ?? "";
  const title = stripInlineMarkdown(match[2] ?? "").trim();
  if (!marker || !title) return null;

  return { level: marker.length, title };
}

function normalizeRenderedHeadingLevel(level: number): 2 | 3 | 4 | 5 | 6 {
  if (level <= 2) return 2;
  if (level === 3) return 3;
  if (level === 4) return 4;
  if (level === 5) return 5;
  return 6;
}

function uniqueHeadingId(title: string, usedIds: Map<string, number>): string {
  const baseId = slugifyForAnchor(title) || "section";
  const count = usedIds.get(baseId) ?? 0;
  usedIds.set(baseId, count + 1);
  return count === 0 ? baseId : `${baseId}-${count + 1}`;
}

function slugifyForAnchor(value: string): string {
  return stripInlineMarkdown(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHeadingText(value: string): string {
  return stripInlineMarkdown(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, target: string) => displayWikilinkLabel(target))
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

function renderInline(
  text: string,
  pageByTitle: Map<string, WikiPage>,
  openPage: (id: string) => void
) {
  const parts: ReactNode[] = [];
  const pattern = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const wikiLabel = match[1];
    const strongLabel = match[2];

    if (wikiLabel) {
      const wikilink = parseWikilinkLabel(wikiLabel);
      const target = resolveInlinePageTarget(wikilink, pageByTitle);
      parts.push(
        target ? (
          <button
            key={`wiki-${key}`}
            className="wikilink"
            type="button"
            onClick={() => openPage(target.id)}
          >
            {wikilink.label}
          </button>
        ) : (
          <span
            key={`wiki-${key}`}
            className={`wikilink ${wikilink.entityKind ? "wikilink--entity" : "wikilink--missing"}`}
          >
            {wikilink.label}
          </span>
        )
      );
      key += 1;
    } else if (strongLabel) {
      parts.push(<strong key={`strong-${key}`}>{strongLabel}</strong>);
      key += 1;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function parseWikilinkLabel(value: string): {
  target: string;
  label: string;
  entityKind?: string;
} {
  const [rawTarget = "", rawLabel] = value.split("|", 2);
  const target = rawTarget.trim();
  const entityKind = typedWikilinkKind(target);
  const label = rawLabel?.trim() || displayWikilinkLabel(target);
  return { target, label, entityKind };
}

function displayWikilinkLabel(target: string): string {
  const typedTarget = /^([A-Za-z][A-Za-z0-9 _-]{1,31}):(.+)$/.exec(target.trim());
  return typedTarget?.[2]?.trim() || target.trim();
}

function typedWikilinkKind(target: string): string | undefined {
  const typedTarget = /^([A-Za-z][A-Za-z0-9 _-]{1,31}):(.+)$/.exec(target.trim());
  return typedTarget?.[1]?.trim().toLowerCase();
}

function resolveInlinePageTarget(
  wikilink: { target: string; label: string; entityKind?: string },
  pageByTitle: Map<string, WikiPage>
): WikiPage | undefined {
  return (
    pageByTitle.get(wikilink.target.toLowerCase()) ??
    pageByTitle.get(displayWikilinkLabel(wikilink.target).toLowerCase()) ??
    pageByTitle.get(wikilink.label.toLowerCase())
  );
}

function GraphView({
  nodes,
  edges,
  nodeById,
  focusId,
  setFocusId,
  openGraphNode
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeById: Map<string, GraphNode>;
  focusId: string;
  setFocusId: (id: string) => void;
  openGraphNode: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Cytoscape.Core | null>(null);
  const openGraphNodeRef = useRef(openGraphNode);
  const setFocusIdRef = useRef(setFocusId);
  const activeFocusRef = useRef(focusId);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    openGraphNodeRef.current = openGraphNode;
  }, [openGraphNode]);

  useEffect(() => {
    setFocusIdRef.current = setFocusId;
  }, [setFocusId]);

  useEffect(() => {
    activeFocusRef.current = hoverId ?? focusId;
    applyCytoscapeFocus(cyRef.current, activeFocusRef.current);
  }, [focusId, hoverId]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [nodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || nodes.length === 0) return;

    let cancelled = false;
    let instance: Cytoscape.Core | null = null;

    void import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled) return;

      instance = cytoscape({
        container,
        elements: buildCytoscapeElements(nodes, edges),
        style: cytoscapeStylesheet,
        layout: {
          name: "cose",
          animate: false,
          fit: true,
          padding: 120,
          componentSpacing: 110,
          idealEdgeLength: 120,
          nodeOverlap: 12,
          nodeRepulsion: 9000,
          nestingFactor: 1.15,
          gravity: 0.75,
          numIter: 1800
        },
        minZoom: 0.25,
        maxZoom: 3,
        wheelSensitivity: 0.16,
        boxSelectionEnabled: false,
        autoungrabify: false,
        userPanningEnabled: true,
        userZoomingEnabled: true
      });

      cyRef.current = instance;
      instance.on("tap", "node", (event) => {
        const id = event.target.id();
        setFocusIdRef.current(id);
        openGraphNodeRef.current(id);
      });
      instance.on("mouseover", "node", (event) => {
        const id = event.target.id();
        setHoverId(id);
        setFocusIdRef.current(id);
      });
      instance.on("mouseout", "node", () => setHoverId(null));
      instance.on("drag", "node", (event) => {
        const id = event.target.id();
        setFocusIdRef.current(id);
      });
      instance.on("zoom pan", () => setZoom(instance?.zoom() ?? 1));
      instance.one("layoutstop", () => {
        instance?.fit(undefined, 120);
        instance?.center();
        setZoom(instance?.zoom() ?? 1);
      });

      applyCytoscapeFocus(instance, activeFocusRef.current);
    });

    return () => {
      cancelled = true;
      instance?.destroy();
      if (cyRef.current === instance) cyRef.current = null;
    };
  }, [edges, nodes]);

  return (
    <section className="graph-view">
      <div className="graph">
        {nodes.length > 0 ? (
          <div ref={containerRef} className="graph__cy" role="img" aria-label="Wiki graph" />
        ) : (
          <div className="graph-empty">No graph nodes yet.</div>
        )}

        <div className="graph__title">
          <span>graph</span>
          <strong>{nodeById.get(focusId)?.title ?? "Personal wiki"}</strong>
        </div>

        <button
          className="graph__legend-toggle"
          type="button"
          onClick={() => setShowLegend((current) => !current)}
          title="Legend"
        >
          {showLegend ? "x" : "?"}
        </button>

        {showLegend ? (
          <div className="graph__legend">
            <div className="title">types</div>
            {typeCounts.map(([kind, count]) => (
              <div key={kind} className="row">
                <span className="sw" style={kindStyle(kind)} />
                <span className="lbl">{kind}</span>
                <span className="ct">{count}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="graph__hud">
          <div>
            nodes <b>{nodes.length}</b>
          </div>
          <div>
            edges <b>{edges.length}</b>
          </div>
          <div>
            zoom <b>{zoom.toFixed(2)}x</b>
          </div>
          {focusId ? (
            <div>
              focus <b>{nodeById.get(focusId)?.title ?? focusId}</b>
            </div>
          ) : null}
        </div>

        <div className="graph__zoom">
          <button
            type="button"
            onClick={() => {
              const nextZoom = Math.max(0.25, (cyRef.current?.zoom() ?? zoom) - 0.15);
              cyRef.current?.zoom(nextZoom);
              setZoom(nextZoom);
            }}
          >
            -
          </button>
          <button
            type="button"
            onClick={() => {
              cyRef.current?.fit(undefined, 80);
              setZoom(cyRef.current?.zoom() ?? 1);
            }}
          >
            o
          </button>
          <button
            type="button"
            onClick={() => {
              const nextZoom = Math.min(3, (cyRef.current?.zoom() ?? zoom) + 0.15);
              cyRef.current?.zoom(nextZoom);
              setZoom(nextZoom);
            }}
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}

function buildCytoscapeElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Cytoscape.ElementDefinition[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const degrees = new Map<string, number>();
  const visibleEdges = edges.filter(
    (edge) => nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId)
  );

  for (const edge of visibleEdges) {
    degrees.set(edge.fromNodeId, (degrees.get(edge.fromNodeId) ?? 0) + 1);
    degrees.set(edge.toNodeId, (degrees.get(edge.toNodeId) ?? 0) + 1);
  }

  return [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: shortGraphLabel(node.title),
        kind: node.kind,
        subtype: node.subtype ?? node.kind,
        color: colorForKind(node.subtype ?? node.kind),
        size: sizeForGraphNode(degrees.get(node.id) ?? 0)
      },
      grabbable: true,
      selectable: true
    })),
    ...visibleEdges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        kind: edge.kind
      },
      selectable: false
    }))
  ];
}

const cytoscapeStylesheet: Cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      width: "data(size)",
      height: "data(size)",
      "background-color": "data(color)",
      "border-width": 0,
      label: "data(label)",
      color: "#b9b2a0",
      "font-family":
        "JetBrains Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      "font-size": 10,
      "min-zoomed-font-size": 7,
      "overlay-opacity": 0,
      "text-background-color": "#171716",
      "text-background-opacity": 0.72,
      "text-background-padding": "2px",
      "text-halign": "center",
      "text-margin-y": 7,
      "text-valign": "bottom"
    }
  },
  {
    selector: "edge",
    style: {
      width: 0.9,
      "curve-style": "haystack",
      "haystack-radius": 0,
      "line-color": "#ece7d9",
      opacity: 0.22
    }
  },
  {
    selector: "node.is-focus",
    style: {
      "border-color": "#c8b574",
      "border-opacity": 1,
      "border-width": 2,
      color: "#ece7d9",
      "text-background-opacity": 0.88,
      "z-index": 20
    }
  },
  {
    selector: ".is-neighbor",
    style: {
      opacity: 1
    }
  },
  {
    selector: ".is-dimmed",
    style: {
      opacity: 0.16,
      "text-opacity": 0.24
    }
  }
];

function applyCytoscapeFocus(cy: Cytoscape.Core | null, focusId: string): void {
  if (!cy) return;

  const elements = cy.elements();
  elements.removeClass("is-dimmed is-neighbor is-focus");
  if (!focusId) return;

  const focus = cy.getElementById(focusId);
  if (focus.empty()) return;

  const neighborhood = focus.closedNeighborhood();
  elements.difference(neighborhood).addClass("is-dimmed");
  neighborhood.addClass("is-neighbor");
  focus.addClass("is-focus");
}

function shortGraphLabel(value: string): string {
  if (value.length <= 42) return value;
  return `${value.slice(0, 39)}...`;
}

function filterSearchItems(pages: WikiPage[], query: string, linkCount: number): SearchItem[] {
  const normalized = query.trim().toLowerCase();
  const commands: SearchItem[] = [
    { id: "home", kind: "cmd", title: "Home", hint: `${pages.length} pages` }
  ];
  if (pages.length > 0) {
    commands.push({ id: "graph", kind: "cmd", title: "Graph", hint: `${linkCount} links` });
  }
  const pageItems = pages.map((page) => ({
    id: page.id,
    kind: page.kind,
    title: page.title,
    hint: page.summary ?? page.status
  }));

  if (!normalized) return [...commands, ...pageItems].slice(0, 12);

  return [...commands, ...pageItems]
    .filter((item) => `${item.title} ${item.hint} ${item.kind}`.toLowerCase().includes(normalized))
    .slice(0, 12);
}

function KindDot({ kind }: { kind: string }) {
  return <span className="dot" style={kindStyle(kind)} />;
}

function kindStyle(kind: string): CSSProperties {
  return { "--kind-color": colorForKind(kind) } as CSSProperties;
}

function colorForKind(kind: string): string {
  const palette = ["#c8b574", "#86b6c8", "#f59e5b", "#d783a7", "#b89ad3", "#8fcf9f", "#d6a36f"];
  let hash = 0;
  for (let index = 0; index < kind.length; index += 1) {
    hash = (hash * 31 + kind.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length] ?? "#8c8576";
}

function matchesFilter(page: WikiPage, filter: string): boolean {
  const normalized = filter.trim().toLowerCase();
  if (!normalized) return true;
  return `${page.title} ${page.summary ?? ""} ${page.status} ${page.kind}`
    .toLowerCase()
    .includes(normalized);
}

function groupPagesByKind(pages: WikiPage[]) {
  const groups = new Map<string, WikiPage[]>();
  for (const page of pages) {
    const existing = groups.get(page.kind) ?? [];
    existing.push(page);
    groups.set(page.kind, existing);
  }

  return [...groups.entries()]
    .map(([kind, groupPages]) => ({
      kind,
      label: humanizeKind(kind),
      pages: groupPages.sort((left, right) => left.title.localeCompare(right.title))
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function humanizeKind(kind: string): string {
  const label = kind.replace(/[-_]+/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getBreadcrumb({
  view,
  activePage,
  graphNodes,
  graphFocusId,
  nodeById,
  openHome,
  openGraph
}: {
  view: ViewState;
  activePage: WikiPage | undefined;
  graphNodes: GraphNode[];
  graphFocusId: string;
  nodeById: Map<string, GraphNode>;
  openHome: () => void;
  openGraph: (focusId?: string) => void;
}): BreadcrumbItem[] {
  const home = { label: "wiki", action: view.mode === "home" ? undefined : openHome };

  if (view.mode === "home") return [home];
  if (view.mode === "graph") {
    return [home, { label: nodeById.get(graphFocusId)?.title ?? "graph" }];
  }

  const graphAction =
    graphNodes.length > 0
      ? () => openGraph(activePage ? pageNodeId(activePage.id) : graphFocusId)
      : undefined;

  return [home, { label: "graph", action: graphAction }, { label: activePage?.title ?? view.id }];
}

function metadataPageId(node: GraphNode): string | undefined {
  const pageId = node.metadata.pageId;
  return typeof pageId === "string" ? pageId : undefined;
}

function pageNodeId(pageId: string): string {
  return `page:${pageId}`;
}

function getRelatedPages(pageId: string, pages: WikiPage[], links: WikiLink[]): WikiPage[] {
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const ids = new Set<string>();
  for (const link of links) {
    if (link.fromPageId === pageId) ids.add(link.toPageId);
    if (link.toPageId === pageId) ids.add(link.fromPageId);
  }
  return [...ids]
    .map((id) => pageById.get(id))
    .filter((page): page is WikiPage => Boolean(page))
    .sort((left, right) => left.title.localeCompare(right.title));
}

function sizeForGraphNode(degree: number): number {
  return 18 + Math.min(24, degree * 2.4);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(date);
}
