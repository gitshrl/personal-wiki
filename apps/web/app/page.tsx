"use client";

import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  WheelEvent
} from "react";
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

type PageGraph = {
  pages: WikiPage[];
  links: WikiLink[];
};

type ViewState = { mode: "home" } | { mode: "graph" } | { mode: "entry"; id: string };

type SearchItem = {
  id: string;
  kind: EntityKind | "cmd";
  title: string;
  hint: string;
};

const apiBase = process.env.NEXT_PUBLIC_PERSONAL_WIKI_API_URL ?? "http://127.0.0.1:4321";

export default function Home() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [links, setLinks] = useState<WikiLink[]>([]);
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
  const connectionStatus = loading ? "" : error ? "offline" : "online";
  const activePage = view.mode === "entry" ? pageById.get(view.id) : undefined;
  const visibleSearchItems = useMemo(
    () => filterSearchItems(pages, search, links.length),
    [pages, search, links.length]
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
      const graphPayload = (await graphResponse.json()) as PageGraph;
      const nextPages = pagesPayload.pages;
      const nextLinks = graphPayload.links ?? [];

      setPages(nextPages);
      setLinks(nextLinks);
      setGraphFocusId((current) => {
        if (current && nextPages.some((page) => page.id === current)) return current;
        return nextPages[0]?.id ?? "";
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "failed to load wiki");
    } finally {
      setLoading(false);
    }
  }

  function openPage(id: string) {
    if (!pageById.has(id)) return;
    setView({ mode: "entry", id });
    setGraphFocusId(id);
    closeSearch();
  }

  function openHome() {
    setView({ mode: "home" });
    closeSearch();
  }

  function openGraph(focusId = graphFocusId || pages[0]?.id || "") {
    if (pages.length === 0) return;
    setGraphFocusId(focusId);
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

  const breadcrumb = getBreadcrumb(view, activePage);
  const pinnedPages = pages.slice(0, 5);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={openHome}>
          <span className="brand__mark" />
          <span>Personal wiki</span>
        </button>

        <div className="breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 ? <span className="breadcrumb__sep">/</span> : null}
              <span className={index === breadcrumb.length - 1 ? "breadcrumb__current" : ""}>
                {part}
              </span>
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
          disabled={pages.length === 0}
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
            <HomeView
              pages={pages}
              links={links}
              loading={loading}
              error={error}
              refreshWiki={refreshWiki}
              openPage={openPage}
              openGraph={openGraph}
            />
          ) : null}

          {view.mode === "graph" ? (
            <GraphView
              pages={pages}
              links={links}
              pageById={pageById}
              focusId={graphFocusId}
              setFocusId={setGraphFocusId}
              openPage={openPage}
            />
          ) : null}

          {view.mode === "entry" && activePage ? (
            <EntityPage
              page={activePage}
              pages={pages}
              links={links}
              pageById={pageById}
              pageByTitle={pageByTitle}
              openPage={openPage}
              openGraph={openGraph}
            />
          ) : null}
        </main>
      </div>

      <footer className="statusbar">
        <span>{pages.length} pages</span>
        <span>{links.length} links</span>
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
  links,
  loading,
  error,
  refreshWiki,
  openPage,
  openGraph
}: {
  pages: WikiPage[];
  links: WikiLink[];
  loading: boolean;
  error: string;
  refreshWiki: () => Promise<void>;
  openPage: (id: string) => void;
  openGraph: (focusId?: string) => void;
}) {
  const recentPages = pages.slice(0, 8);
  const linkedPages = getMostLinkedPages(pages, links).slice(0, 6);
  const updatedAt = pages[0]?.updatedAt;
  const showEmpty = loading || error || pages.length === 0;
  const emptyTitle = loading ? "Opening wiki" : error ? "Wiki is offline" : "Start with one page";
  const emptyCopy = loading
    ? "Checking the workspace."
    : error
      ? "Start the wiki server, then refresh this view."
      : "Pages, notes, chats, and sources will appear here as the wiki grows.";
  const lede =
    pages.length > 0
      ? `${pages.length} pages and ${links.length} graph links.`
      : "A workspace for pages, notes, chats, and sources.";

  return (
    <section className="home-view">
      <div className="home-view__date">
        {loading ? "loading" : updatedAt ? formatDateTime(updatedAt) : "wiki"}
      </div>
      <h1>Personal wiki</h1>
      <p className="home-view__lede">{lede}</p>

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
        <>
          <div className="home-grid">
            <section className="home-block">
              <div className="section-title">
                <h2>recent</h2>
                <button type="button" onClick={() => void refreshWiki()}>
                  refresh
                </button>
              </div>
              <div className="row-list">
                {recentPages.map((page) => (
                  <button
                    key={page.id}
                    className="row-link"
                    type="button"
                    onClick={() => openPage(page.id)}
                  >
                    <KindDot kind={page.kind} />
                    <span>{page.title}</span>
                    <span>{formatDate(page.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="home-block">
              <div className="section-title">
                <h2>linked</h2>
                <span>{linkedPages.length}</span>
              </div>
              <div className="row-list">
                {linkedPages.length > 0 ? (
                  linkedPages.map(({ page, count }) => (
                    <button
                      key={page.id}
                      className="row-link"
                      type="button"
                      onClick={() => openPage(page.id)}
                    >
                      <KindDot kind={page.kind} />
                      <span>{page.title}</span>
                      <span>{count}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty-copy">Waiting for links.</p>
                )}
              </div>
            </section>
          </div>

          <button className="graph-strip" type="button" onClick={() => openGraph(pages[0]?.id)}>
            <span>open graph</span>
            <span>{links.length} links</span>
          </button>
        </>
      ) : null}
    </section>
  );
}

function EntityPage({
  page,
  pages,
  links,
  pageById,
  pageByTitle,
  openPage,
  openGraph
}: {
  page: WikiPage;
  pages: WikiPage[];
  links: WikiLink[];
  pageById: Map<string, WikiPage>;
  pageByTitle: Map<string, WikiPage>;
  openPage: (id: string) => void;
  openGraph: (focusId?: string) => void;
}) {
  const outgoingPages = getOutgoingPages(page.id, links, pageById);
  const backlinkPages = getBacklinkPages(page.id, links, pageById);
  const relatedPages = getRelatedPages(page.id, pages, links);

  return (
    <article className="entity-page">
      <header className="entity-page__header">
        <div className="entity-page__kind">
          <KindDot kind={page.kind} />
          <span>
            {page.kind}
            {page.sourceType ? ` - ${page.sourceType}` : ""}
          </span>
        </div>
        <h1>{page.title}</h1>
        {page.summary ? <p className="entity-page__lede">{page.summary}</p> : null}
        {page.sourceUrl ? (
          <a className="entity-page__url" href={page.sourceUrl} target="_blank" rel="noreferrer">
            {page.sourceUrl}
          </a>
        ) : null}
        <MetadataRow
          page={page}
          relatedCount={relatedPages.length}
          linkCount={outgoingPages.length + backlinkPages.length}
        />
      </header>

      {page.body ? (
        <section className="entity-section entity-section--prose">
          <WikiProse body={page.body} pageByTitle={pageByTitle} openPage={openPage} />
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

      <section className="entity-section">
        <div className="section-title">
          <h2>graph</h2>
          <button type="button" onClick={() => openGraph(page.id)}>
            open neighborhood
          </button>
        </div>
        <LinkColumns
          outgoingPages={outgoingPages}
          backlinkPages={backlinkPages}
          openPage={openPage}
        />
      </section>
    </article>
  );
}

function MetadataRow({
  page,
  relatedCount,
  linkCount
}: {
  page: WikiPage;
  relatedCount: number;
  linkCount: number;
}) {
  const items: Array<[string, string]> = [
    ["updated", formatDate(page.updatedAt)],
    ["status", page.status]
  ];

  if (page.trust) items.push(["trust", page.trust]);
  if (page.createdByAgentId) items.push(["agent", page.createdByAgentId]);
  if (relatedCount > 0) items.push(["related", String(relatedCount)]);
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
  body,
  pageByTitle,
  openPage
}: {
  body: string;
  pageByTitle: Map<string, WikiPage>;
  openPage: (id: string) => void;
}) {
  return (
    <div className="prose">
      {body.split(/\n\n+/).map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 24)}-${index}`}>
          {renderInline(paragraph, pageByTitle, openPage)}
        </p>
      ))}
    </div>
  );
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
      const target = pageByTitle.get(wikiLabel.toLowerCase());
      parts.push(
        target ? (
          <button
            key={`wiki-${key}`}
            className="wikilink"
            type="button"
            onClick={() => openPage(target.id)}
          >
            {wikiLabel}
          </button>
        ) : (
          <span key={`wiki-${key}`} className="wikilink wikilink--missing">
            {wikiLabel}
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

function LinkColumns({
  outgoingPages,
  backlinkPages,
  openPage
}: {
  outgoingPages: WikiPage[];
  backlinkPages: WikiPage[];
  openPage: (id: string) => void;
}) {
  return (
    <div className="link-columns">
      <LinkColumn title="outgoing" pages={outgoingPages} openPage={openPage} />
      <LinkColumn title="backlinks" pages={backlinkPages} openPage={openPage} />
    </div>
  );
}

function LinkColumn({
  title,
  pages,
  openPage
}: {
  title: string;
  pages: WikiPage[];
  openPage: (id: string) => void;
}) {
  return (
    <div className="link-column">
      <h3>
        {title} <span>{pages.length}</span>
      </h3>
      {pages.length > 0 ? (
        pages.map((page) => (
          <button
            key={page.id}
            className="link-row"
            type="button"
            onClick={() => openPage(page.id)}
          >
            <KindDot kind={page.kind} />
            <span>{page.title}</span>
            <span>{page.kind}</span>
          </button>
        ))
      ) : (
        <p>None.</p>
      )}
    </div>
  );
}

function GraphView({
  pages,
  links,
  pageById,
  focusId,
  setFocusId,
  openPage
}: {
  pages: WikiPage[];
  links: WikiLink[];
  pageById: Map<string, WikiPage>;
  focusId: string;
  setFocusId: (id: string) => void;
  openPage: (id: string) => void;
}) {
  const layout = useMemo(() => buildGraphLayout(pages, links), [pages, links]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );

  useEffect(() => {
    function stopDrag() {
      dragRef.current = null;
    }

    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  const highlightedIds = useMemo(() => {
    const rootId = hoverId ?? focusId;
    const ids = new Set<string>();
    if (!rootId) return ids;
    ids.add(rootId);
    for (const edge of layout.edges) {
      const from = layout.nodes[edge.s];
      const to = layout.nodes[edge.t];
      if (!from || !to) continue;
      if (from.id === rootId) ids.add(to.id);
      if (to.id === rootId) ids.add(from.id);
    }
    return ids;
  }, [focusId, hoverId, layout]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of layout.nodes) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [layout.nodes]);

  function onMouseDown(event: ReactMouseEvent<SVGSVGElement>) {
    const target = event.target as Element;
    if (target.closest(".graph-node")) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y
    };
    event.preventDefault();
  }

  function onMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.max(0.35, Math.min(2.5, current + delta)));
  }

  return (
    <section className="graph-view">
      <div className="graph">
        {layout.nodes.length > 0 ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Wiki graph"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={() => {
              dragRef.current = null;
            }}
            onWheel={onWheel}
            style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
          >
            <defs>
              <pattern
                id="graph-dots"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="0.6" cy="0.6" r="0.6" fill="rgba(120,130,140,0.14)" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#graph-dots)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {layout.edges.map((edge) => {
                const from = layout.nodes[edge.s];
                const to = layout.nodes[edge.t];
                if (!from || !to) return null;
                const isHighlighted =
                  highlightedIds.size === 0 ||
                  (highlightedIds.has(from.id) && highlightedIds.has(to.id));
                return (
                  <line
                    key={edge.id}
                    className="graph-edge"
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    opacity={isHighlighted ? 1 : 0.18}
                  />
                );
              })}
              {layout.nodes.map((node) => {
                const isHighlighted = highlightedIds.size === 0 || highlightedIds.has(node.id);
                const isFocus = node.id === focusId;
                return (
                  <g
                    key={node.id}
                    className="graph-node"
                    transform={`translate(${node.x},${node.y})`}
                    onMouseEnter={() => {
                      setHoverId(node.id);
                      setFocusId(node.id);
                    }}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => openPage(node.id)}
                  >
                    {isFocus ? (
                      <circle className="graph-node__ring" r={node.r + 6} opacity={0.85} />
                    ) : null}
                    <circle
                      className="graph-node__circle"
                      r={node.r}
                      opacity={isHighlighted ? 0.95 : 0.22}
                      style={kindStyle(node.kind)}
                    />
                    <text x={node.r + 6} y="3" opacity={isHighlighted ? 1 : 0.35}>
                      {node.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          <div className="graph-empty">Graph appears after pages connect.</div>
        )}

        <div className="graph__title">
          <span>graph</span>
          <strong>{pageById.get(focusId)?.title ?? "Personal wiki"}</strong>
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
            nodes <b>{layout.nodes.length}</b>
          </div>
          <div>
            edges <b>{layout.edges.length}</b>
          </div>
          <div>
            zoom <b>{zoom.toFixed(2)}x</b>
          </div>
          {focusId ? (
            <div>
              focus <b>{pageById.get(focusId)?.title ?? focusId}</b>
            </div>
          ) : null}
        </div>

        <div className="graph__zoom">
          <button type="button" onClick={() => setZoom((current) => Math.max(0.35, current - 0.1))}>
            -
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            o
          </button>
          <button type="button" onClick={() => setZoom((current) => Math.min(2.5, current + 0.1))}>
            +
          </button>
        </div>
      </div>
    </section>
  );
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

function getBreadcrumb(view: ViewState, activePage: WikiPage | undefined): string[] {
  if (view.mode === "home") return ["wiki"];
  if (view.mode === "graph") return ["wiki", "graph"];
  return ["wiki", activePage?.kind ?? "page", activePage?.title ?? view.id];
}

function getOutgoingPages(
  pageId: string,
  links: WikiLink[],
  pageById: Map<string, WikiPage>
): WikiPage[] {
  return uniquePages(
    links
      .filter((link) => link.fromPageId === pageId)
      .map((link) => pageById.get(link.toPageId))
      .filter((page): page is WikiPage => Boolean(page))
  );
}

function getBacklinkPages(
  pageId: string,
  links: WikiLink[],
  pageById: Map<string, WikiPage>
): WikiPage[] {
  return uniquePages(
    links
      .filter((link) => link.toPageId === pageId)
      .map((link) => pageById.get(link.fromPageId))
      .filter((page): page is WikiPage => Boolean(page))
  );
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

function getMostLinkedPages(pages: WikiPage[], links: WikiLink[]) {
  const counts = new Map<string, number>();
  for (const link of links) {
    counts.set(link.fromPageId, (counts.get(link.fromPageId) ?? 0) + 1);
    counts.set(link.toPageId, (counts.get(link.toPageId) ?? 0) + 1);
  }
  return pages
    .map((page) => ({ page, count: counts.get(page.id) ?? 0 }))
    .filter((item) => item.count > 0)
    .sort(
      (left, right) => right.count - left.count || left.page.title.localeCompare(right.page.title)
    );
}

function uniquePages(pages: WikiPage[]): WikiPage[] {
  return [...new Map(pages.map((page) => [page.id, page])).values()].sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

function buildGraphLayout(pages: WikiPage[], links: WikiLink[]) {
  const width = 1200;
  const height = 760;
  const visiblePages = pages.slice(0, 500);
  const count = Math.max(1, visiblePages.length);
  const nodes = visiblePages.map((page, index) => {
    const angle = index * 2.399963229728653;
    const spread = Math.sqrt(index + 1) / Math.sqrt(count);
    const radius = Math.min(width, height) * 0.39 * spread;
    return {
      ...page,
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      r: sizeForPage(page, links)
    };
  });
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = links
    .map((link) => {
      const s = nodeIndex.get(link.fromPageId);
      const t = nodeIndex.get(link.toPageId);
      if (s === undefined || t === undefined) return null;
      return { ...link, s, t };
    })
    .filter((edge): edge is WikiLink & { s: number; t: number } => Boolean(edge));

  const iterations = Math.min(260, Math.max(120, nodes.length * 6));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const left = nodes[leftIndex];
        const right = nodes[rightIndex];
        if (!left || !right) continue;
        let dx = left.x - right.x;
        let dy = left.y - right.y;
        const distanceSquared = dx * dx + dy * dy + 0.01;
        const distance = Math.sqrt(distanceSquared);
        if (distance > 320) continue;
        const force = 6200 / distanceSquared;
        dx /= distance;
        dy /= distance;
        left.vx += dx * force;
        left.vy += dy * force;
        right.vx -= dx * force;
        right.vy -= dy * force;
      }
    }

    for (const edge of edges) {
      const from = nodes[edge.s];
      const to = nodes[edge.t];
      if (!from || !to) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const target = 126;
      const force = (distance - target) * 0.018;
      const ux = dx / distance;
      const uy = dy / distance;
      from.vx += ux * force;
      from.vy += uy * force;
      to.vx -= ux * force;
      to.vy -= uy * force;
    }

    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * 0.0013;
      node.vy += (height / 2 - node.y) * 0.0013;
      node.vx *= 0.78;
      node.vy *= 0.78;
      node.x = clamp(node.x + node.vx, 32, width - 32);
      node.y = clamp(node.y + node.vy, 32, height - 32);
    }
  }

  return {
    width,
    height,
    nodes: nodes.map((node) => ({
      ...node,
      x: Math.round(node.x),
      y: Math.round(node.y)
    })),
    edges
  };
}

function sizeForPage(page: WikiPage, links: WikiLink[] = []): number {
  const degree = links.filter(
    (link) => link.fromPageId === page.id || link.toPageId === page.id
  ).length;
  return 8 + Math.min(12, degree * 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
