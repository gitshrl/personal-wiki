"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import {
  buildEntries,
  pinnedEntries,
  wikiData,
  type EntityKind,
  type GraphEdge,
  type WikiData,
  type WikiEntry
} from "./mock-data";

type ViewState = { mode: "home" } | { mode: "graph" } | { mode: "entry"; id: string };

type SearchItem = {
  id: string;
  kind: EntityKind | "cmd";
  title: string;
  hint: string;
};

const entityGroups: Array<{ kind: EntityKind; label: string }> = [
  { kind: "article", label: "Articles" },
  { kind: "topic", label: "Topics" },
  { kind: "person", label: "People" },
  { kind: "agent", label: "Agents" },
  { kind: "org", label: "Orgs" }
];

export default function Home() {
  const entries = useMemo(() => buildEntries(wikiData), []);
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const entryByTitle = useMemo(
    () => new Map(entries.map((entry) => [entry.title.toLowerCase(), entry])),
    [entries]
  );

  const [view, setView] = useState<ViewState>({ mode: "home" });
  const [graphFocusId, setGraphFocusId] = useState("topic-personal-wiki");
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState<Record<EntityKind, boolean>>({
    article: true,
    topic: true,
    person: true,
    agent: true,
    org: true
  });

  const activeEntry = view.mode === "entry" ? entryById.get(view.id) : undefined;
  const visibleSearchItems = useMemo(() => filterSearchItems(entries, search), [entries, search]);

  function openEntry(id: string) {
    const entry = entryById.get(id);
    if (!entry) {
      return;
    }

    setView({ mode: "entry", id });
    setGraphFocusId(id);
    setSearch("");
    setSearchOpen(false);
  }

  function openHome() {
    setView({ mode: "home" });
    setSearch("");
    setSearchOpen(false);
  }

  function openGraph(focusId = graphFocusId) {
    setGraphFocusId(focusId);
    setView({ mode: "graph" });
    setSearch("");
    setSearchOpen(false);
  }

  function pickSearchItem(item: SearchItem | undefined) {
    if (!item) {
      return;
    }

    if (item.id === "home") {
      openHome();
      return;
    }

    if (item.id === "graph") {
      openGraph();
      return;
    }

    openEntry(item.id);
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
      setSearch("");
      setSearchOpen(false);
    }
  }

  const breadcrumb = getBreadcrumb(view, activeEntry);

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
            placeholder="Search entries"
            aria-label="Search entries"
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
                  <span className={`dot dot--${item.kind}`} />
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
          onClick={() => openGraph()}
        >
          graph
        </button>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar__filter">
            <input
              value={sidebarFilter}
              onChange={(event) => setSidebarFilter(event.target.value)}
              placeholder="filter notes..."
              aria-label="Filter notes"
            />
          </div>

          <nav className="tree" aria-label="Wiki entries">
            <div className="tree__section">Pinned</div>
            <div className="tree__group tree__group--open">
              {pinnedEntries
                .map((id) => entryById.get(id))
                .filter((entry): entry is WikiEntry => Boolean(entry))
                .map((entry) => (
                  <TreeItem
                    key={entry.id}
                    entry={entry}
                    active={activeEntry?.id === entry.id}
                    onClick={() => openEntry(entry.id)}
                  />
                ))}
            </div>

            <div className="tree__section">Entities</div>
            {entityGroups.map((group) => {
              const groupEntries = entries
                .filter((entry) => entry.kind === group.kind)
                .filter((entry) => matchesFilter(entry, sidebarFilter));

              return (
                <div key={group.kind} className="tree__group">
                  <button
                    className="tree__group-head"
                    type="button"
                    onClick={() =>
                      setGroupOpen((current) => ({
                        ...current,
                        [group.kind]: !current[group.kind]
                      }))
                    }
                  >
                    <span className="tree__caret">{groupOpen[group.kind] ? "v" : ">"}</span>
                    <span>{group.label}</span>
                    <span className="tree__count">{groupEntries.length}</span>
                  </button>

                  {groupOpen[group.kind] ? (
                    <div>
                      {groupEntries.length > 0 ? (
                        groupEntries.map((entry) => (
                          <TreeItem
                            key={entry.id}
                            entry={entry}
                            active={activeEntry?.id === entry.id}
                            onClick={() => openEntry(entry.id)}
                          />
                        ))
                      ) : (
                        <div className="tree__empty">no matches</div>
                      )}
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
              entries={entries}
              data={wikiData}
              openEntry={openEntry}
              openGraph={openGraph}
            />
          ) : null}

          {view.mode === "graph" ? (
            <GraphView
              data={wikiData}
              entries={entries}
              entryById={entryById}
              focusId={graphFocusId}
              setFocusId={setGraphFocusId}
              openEntry={openEntry}
            />
          ) : null}

          {view.mode === "entry" && activeEntry ? (
            <EntityPage
              data={wikiData}
              entry={activeEntry}
              entries={entries}
              entryById={entryById}
              entryByTitle={entryByTitle}
              openEntry={openEntry}
              openGraph={openGraph}
            />
          ) : null}
        </main>
      </div>

      <footer className="statusbar">
        <span>{entries.length} entries</span>
        <span>{wikiData.graph.edges.length} links</span>
        <span className="statusbar__right">mock data only</span>
      </footer>
    </div>
  );
}

function TreeItem({
  entry,
  active,
  onClick
}: {
  entry: WikiEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`tree__item ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <span className={`dot dot--${entry.kind}`} />
      <span>{entry.title}</span>
    </button>
  );
}

function HomeView({
  entries,
  data,
  openEntry,
  openGraph
}: {
  entries: WikiEntry[];
  data: WikiData;
  openEntry: (id: string) => void;
  openGraph: (focusId?: string) => void;
}) {
  const recentEntries = entries
    .filter((entry) => entry.addedAt)
    .sort((left, right) => (right.addedAt ?? "").localeCompare(left.addedAt ?? ""))
    .slice(0, 8);
  const activeTopics = entries
    .filter((entry) => entry.kind === "topic")
    .sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0))
    .slice(0, 6);

  return (
    <section className="home-view">
      <div className="home-view__date">Wednesday, 20 May 2026</div>
      <h1>good evening, Sahrul.</h1>
      <p className="home-view__lede">
        {entries.length} entries in the vault across {data.topics.length} topics,{" "}
        {data.sources.length} sources, and {data.graph.edges.length} graph links.
      </p>

      <div className="home-grid">
        <section className="home-block">
          <div className="section-title">
            <h2>recent</h2>
            <span>across all kinds</span>
          </div>
          <div className="row-list">
            {recentEntries.map((entry) => (
              <button
                key={entry.id}
                className="row-link"
                type="button"
                onClick={() => openEntry(entry.id)}
              >
                <span className={`dot dot--${entry.kind}`} />
                <span>{entry.title}</span>
                <span>{entry.addedAt}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-block">
          <div className="section-title">
            <h2>active topics</h2>
            <span>by weight</span>
          </div>
          <div className="row-list">
            {activeTopics.map((entry) => (
              <button
                key={entry.id}
                className="row-link"
                type="button"
                onClick={() => openEntry(entry.id)}
              >
                <span className={`dot dot--${entry.kind}`} />
                <span>{entry.title}</span>
                <span>{entry.weight?.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <button
        className="graph-strip"
        type="button"
        onClick={() => openGraph("topic-personal-wiki")}
      >
        <span>open graph neighborhood</span>
        <span>focus: Personal wiki</span>
      </button>
    </section>
  );
}

function EntityPage({
  data,
  entry,
  entries,
  entryById,
  entryByTitle,
  openEntry,
  openGraph
}: {
  data: WikiData;
  entry: WikiEntry;
  entries: WikiEntry[];
  entryById: Map<string, WikiEntry>;
  entryByTitle: Map<string, WikiEntry>;
  openEntry: (id: string) => void;
  openGraph: (focusId?: string) => void;
}) {
  const outgoingEntries = getOutgoingEntries(entry, data, entryById, entryByTitle);
  const backlinkEntries = getBacklinkEntries(entry, data, entries, entryById);
  const relatedArticles = entry.kind === "topic" ? getRelatedArticles(entry, data, entries) : [];
  const pageTitle = entry.kind === "article" && entry.isOwn ? "note" : entry.kind;

  return (
    <article className="entity-page">
      <header className="entity-page__header">
        <div className="entity-page__kind">
          <span className={`dot dot--${entry.kind}`} />
          <span>
            {pageTitle}
            {entry.sourceType ? ` - ${entry.sourceType}` : ""}
          </span>
        </div>
        <h1>{entry.title}</h1>
        {entry.summary ? <p className="entity-page__lede">{entry.summary}</p> : null}
        {entry.url ? (
          <a className="entity-page__url" href={entry.url} target="_blank" rel="noreferrer">
            {entry.url}
          </a>
        ) : null}
        <MetadataRow
          entry={entry}
          relatedCount={relatedArticles.length}
          linkCount={outgoingEntries.length + backlinkEntries.length}
        />
      </header>

      {entry.body ? (
        <section className="entity-section entity-section--prose">
          <WikiProse body={entry.body} entryByTitle={entryByTitle} openEntry={openEntry} />
        </section>
      ) : (
        <section className="entity-section">
          <p className="empty-copy">
            No body yet. This mock page still has metadata and graph links.
          </p>
        </section>
      )}

      {relatedArticles.length > 0 ? (
        <section className="entity-section">
          <div className="section-title">
            <h2>articles</h2>
            <span>{relatedArticles.length}</span>
          </div>
          <div className="card-list">
            {relatedArticles.map((article) => (
              <button
                key={article.id}
                className="card-row"
                type="button"
                onClick={() => openEntry(article.id)}
              >
                <span>
                  <strong>{article.title}</strong>
                  <small>
                    {article.sourceType}
                    {article.author ? ` - ${article.author}` : ""}
                  </small>
                </span>
                <span>{article.addedAt}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="entity-section">
        <div className="section-title">
          <h2>graph</h2>
          <button type="button" onClick={() => openGraph(entry.id)}>
            open neighborhood
          </button>
        </div>
        <LinkColumns
          outgoingEntries={outgoingEntries}
          backlinkEntries={backlinkEntries}
          openEntry={openEntry}
        />
      </section>
    </article>
  );
}

function MetadataRow({
  entry,
  relatedCount,
  linkCount
}: {
  entry: WikiEntry;
  relatedCount: number;
  linkCount: number;
}) {
  const items: Array<[string, string]> = [];

  if (entry.author) {
    items.push(["by", entry.author]);
  }
  if (entry.addedAt) {
    items.push(["added", entry.addedAt]);
  }
  if (entry.status) {
    items.push(["status", entry.status]);
  }
  if (entry.weight !== undefined) {
    items.push(["weight", entry.weight.toFixed(2)]);
  }
  if (entry.trust) {
    items.push(["trust", entry.trust]);
  }
  if (entry.tag) {
    items.push(["tag", `#${entry.tag}`]);
  }
  if (relatedCount > 0) {
    items.push(["articles", String(relatedCount)]);
  }
  if (linkCount > 0) {
    items.push(["links", String(linkCount)]);
  }

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
  entryByTitle,
  openEntry
}: {
  body: string;
  entryByTitle: Map<string, WikiEntry>;
  openEntry: (id: string) => void;
}) {
  return (
    <div className="prose">
      {body.split(/\n\n+/).map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 24)}-${index}`}>
          {renderInline(paragraph, entryByTitle, openEntry)}
        </p>
      ))}
    </div>
  );
}

function renderInline(
  text: string,
  entryByTitle: Map<string, WikiEntry>,
  openEntry: (id: string) => void
) {
  const parts: ReactNode[] = [];
  const pattern = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[0] ?? "";
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const wikiLabel = match[1];
    const strongLabel = match[2];

    if (wikiLabel) {
      const target = entryByTitle.get(wikiLabel.toLowerCase());
      parts.push(
        target ? (
          <button
            key={`wiki-${key}`}
            className="wikilink"
            type="button"
            onClick={() => openEntry(target.id)}
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

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function LinkColumns({
  outgoingEntries,
  backlinkEntries,
  openEntry
}: {
  outgoingEntries: WikiEntry[];
  backlinkEntries: WikiEntry[];
  openEntry: (id: string) => void;
}) {
  return (
    <div className="link-columns">
      <LinkColumn title="outgoing" entries={outgoingEntries} openEntry={openEntry} />
      <LinkColumn title="backlinks" entries={backlinkEntries} openEntry={openEntry} />
    </div>
  );
}

function LinkColumn({
  title,
  entries,
  openEntry
}: {
  title: string;
  entries: WikiEntry[];
  openEntry: (id: string) => void;
}) {
  return (
    <div className="link-column">
      <h3>
        {title} <span>{entries.length}</span>
      </h3>
      {entries.length > 0 ? (
        entries.map((entry) => (
          <button
            key={entry.id}
            className="link-row"
            type="button"
            onClick={() => openEntry(entry.id)}
          >
            <span className={`dot dot--${entry.kind}`} />
            <span>{entry.title}</span>
            <span>{entry.kind}</span>
          </button>
        ))
      ) : (
        <p>none</p>
      )}
    </div>
  );
}

function GraphView({
  data,
  entries,
  entryById,
  focusId,
  setFocusId,
  openEntry
}: {
  data: WikiData;
  entries: WikiEntry[];
  entryById: Map<string, WikiEntry>;
  focusId: string;
  setFocusId: (id: string) => void;
  openEntry: (id: string) => void;
}) {
  const focusEntry = entryById.get(focusId) ?? entries.find((entry) => entry.kind === "topic");
  const graph = useMemo(() => {
    if (!focusEntry) {
      return { nodes: [], edges: [] as GraphEdge[], positions: new Map<string, Point>() };
    }

    const touchingEdges = data.graph.edges.filter(
      (edge) => edge.from === focusEntry.id || edge.to === focusEntry.id
    );
    const neighborIds = touchingEdges.map((edge) =>
      edge.from === focusEntry.id ? edge.to : edge.from
    );
    const uniqueIds = [focusEntry.id, ...Array.from(new Set(neighborIds))].slice(0, 13);
    const nodes = uniqueIds
      .map((id) => entryById.get(id))
      .filter((entry): entry is WikiEntry => Boolean(entry));
    const nodeIds = new Set(nodes.map((entry) => entry.id));
    const edges = touchingEdges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    const positions = buildRadialPositions(nodes);

    return { nodes, edges, positions };
  }, [data.graph.edges, entryById, focusEntry]);

  if (!focusEntry) {
    return <div className="graph-view">No graph focus available.</div>;
  }

  return (
    <section className="graph-view">
      <div className="graph-view__header">
        <div>
          <div className="entity-page__kind">
            <span className={`dot dot--${focusEntry.kind}`} />
            graph neighborhood
          </div>
          <h1>{focusEntry.title}</h1>
        </div>
        <div className="graph-view__meta">
          <span>{graph.nodes.length} nodes</span>
          <span>{graph.edges.length} edges</span>
        </div>
      </div>

      <div className="graph-canvas">
        <svg
          viewBox="0 0 760 420"
          role="img"
          aria-label={`Graph neighborhood for ${focusEntry.title}`}
        >
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(236, 231, 217, 0.12)" />
            </pattern>
          </defs>
          <rect width="760" height="420" fill="url(#grid)" />

          {graph.edges.map((edge) => {
            const from = graph.positions.get(edge.from);
            const to = graph.positions.get(edge.to);
            if (!from || !to) {
              return null;
            }

            return (
              <line
                key={`${edge.from}-${edge.to}-${edge.type}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="graph-edge"
              />
            );
          })}

          {graph.nodes.map((entry) => {
            const point = graph.positions.get(entry.id);
            if (!point) {
              return null;
            }

            const isFocus = entry.id === focusEntry.id;
            const radius = isFocus ? 20 : entry.kind === "topic" ? 14 : 11;

            return (
              <g
                key={entry.id}
                className="graph-node"
                transform={`translate(${point.x}, ${point.y})`}
                onClick={() => {
                  setFocusId(entry.id);
                  openEntry(entry.id);
                }}
              >
                <circle
                  r={radius}
                  className={`graph-node__circle graph-node__circle--${entry.kind}`}
                />
                {isFocus ? <circle r={radius + 7} className="graph-node__ring" /> : null}
                <text x={radius + 8} y="4">
                  {entry.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="graph-list">
        {graph.nodes
          .filter((entry) => entry.id !== focusEntry.id)
          .map((entry) => (
            <button key={entry.id} type="button" onClick={() => setFocusId(entry.id)}>
              <span className={`dot dot--${entry.kind}`} />
              <span>{entry.title}</span>
              <span>{entry.kind}</span>
            </button>
          ))}
      </div>
    </section>
  );
}

type Point = {
  x: number;
  y: number;
};

function buildRadialPositions(nodes: WikiEntry[]) {
  const positions = new Map<string, Point>();
  const center = { x: 330, y: 210 };
  const radius = 148;

  nodes.forEach((entry, index) => {
    if (index === 0) {
      positions.set(entry.id, center);
      return;
    }

    const angle = ((index - 1) / Math.max(nodes.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
    positions.set(entry.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    });
  });

  return positions;
}

function getOutgoingEntries(
  entry: WikiEntry,
  data: WikiData,
  entryById: Map<string, WikiEntry>,
  entryByTitle: Map<string, WikiEntry>
) {
  const ids = new Set<string>();

  for (const id of getWikiLinkIds(entry.body, entryByTitle)) {
    ids.add(id);
  }

  for (const edge of data.graph.edges) {
    if (edge.from === entry.id) {
      ids.add(edge.to);
    }
  }

  return resolveEntries(ids, entryById);
}

function getBacklinkEntries(
  entry: WikiEntry,
  data: WikiData,
  entries: WikiEntry[],
  entryById: Map<string, WikiEntry>
) {
  const ids = new Set<string>();
  const marker = `[[${entry.title.toLowerCase()}]]`;

  for (const other of entries) {
    if (other.id === entry.id || !other.body) {
      continue;
    }

    if (other.body.toLowerCase().includes(marker)) {
      ids.add(other.id);
    }
  }

  for (const edge of data.graph.edges) {
    if (edge.to === entry.id) {
      ids.add(edge.from);
    }
  }

  return resolveEntries(ids, entryById);
}

function getRelatedArticles(entry: WikiEntry, data: WikiData, entries: WikiEntry[]) {
  const articleIds = new Set<string>();
  const topicMarker = `[[${entry.title.toLowerCase()}]]`;

  for (const edge of data.graph.edges) {
    if (edge.to === entry.id) {
      articleIds.add(edge.from);
    }
    if (edge.from === entry.id) {
      articleIds.add(edge.to);
    }
  }

  for (const other of entries) {
    if (other.kind === "article" && other.body?.toLowerCase().includes(topicMarker)) {
      articleIds.add(other.id);
    }
  }

  return entries
    .filter((candidate) => candidate.kind === "article" && articleIds.has(candidate.id))
    .slice(0, 10);
}

function getWikiLinkIds(body: string | undefined, entryByTitle: Map<string, WikiEntry>) {
  const ids = new Set<string>();
  if (!body) {
    return ids;
  }

  const pattern = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const label = match[1];
    if (!label) {
      continue;
    }

    const target = entryByTitle.get(label.toLowerCase());
    if (target) {
      ids.add(target.id);
    }
  }

  return ids;
}

function resolveEntries(ids: Set<string>, entryById: Map<string, WikiEntry>) {
  const entries: WikiEntry[] = [];

  ids.forEach((id) => {
    const entry = entryById.get(id);
    if (entry) {
      entries.push(entry);
    }
  });

  return entries;
}

function filterSearchItems(entries: WikiEntry[], query: string) {
  const baseItems: SearchItem[] = [
    { id: "home", kind: "cmd", title: "Go to Home", hint: "" },
    { id: "graph", kind: "cmd", title: "Open Graph", hint: "" },
    ...entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      hint: entry.author ?? entry.sourceType ?? entry.status ?? ""
    }))
  ];

  if (!query.trim()) {
    return baseItems.slice(0, 10);
  }

  const lowered = query.toLowerCase();
  return baseItems
    .filter(
      (item) =>
        item.title.toLowerCase().includes(lowered) ||
        item.kind.toLowerCase().includes(lowered) ||
        item.hint.toLowerCase().includes(lowered)
    )
    .slice(0, 12);
}

function getBreadcrumb(view: ViewState, entry: WikiEntry | undefined) {
  if (view.mode === "home") {
    return ["Home"];
  }

  if (view.mode === "graph") {
    return ["Graph"];
  }

  if (entry) {
    return [entry.kind, entry.title];
  }

  return ["Entry"];
}

function matchesFilter(entry: WikiEntry, filter: string) {
  if (!filter.trim()) {
    return true;
  }

  const lowered = filter.toLowerCase();
  return (
    entry.title.toLowerCase().includes(lowered) ||
    entry.kind.toLowerCase().includes(lowered) ||
    (entry.author ?? "").toLowerCase().includes(lowered) ||
    (entry.sourceType ?? "").toLowerCase().includes(lowered) ||
    (entry.tag ?? "").toLowerCase().includes(lowered)
  );
}
