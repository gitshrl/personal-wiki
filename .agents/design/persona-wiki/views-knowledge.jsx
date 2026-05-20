/* global React, fmtDate */
/* Loka — unified Knowledge list */

const { useState: useKState, useMemo: useKMemo } = React;

function KnowledgeView({ data, openNode }) {
  const [kind, setKind] = useKState("all");
  const [query, setQuery] = useKState("");

  const entries = useKMemo(() => {
    const items = [];
    data.topics.forEach(t => items.push({
      id: t.id,
      kind: "topic",
      kindLabel: "topic",
      title: t.label,
      summary: t.summary,
      author: "you",
      addedAt: "2026-05-10",
      tags: [t.status, t.weight.toFixed(2)],
    }));
    data.sources.forEach(s => items.push({
      id: s.id,
      kind: "source",
      kindLabel: s.type,
      title: s.title,
      summary: s.url,
      author: s.author,
      addedAt: (s.fetched || "").slice(0, 10),
      tags: ["trust·"+s.trust],
    }));
    data.claims.forEach(c => items.push({
      id: c.id,
      kind: "claim",
      kindLabel: "claim",
      title: c.text,
      summary: "cites " + c.sourceIds.join(", "),
      author: c.sourceIds[0] ? sourceAuthor(data, c.sourceIds[0]) : "you",
      addedAt: c.created,
      tags: [c.confidence, c.status],
    }));
    // Promote a few ingested notes/decisions from inbox to first-class entries
    data.inbox
      .filter(i => i.status === "ingested" && (i.type === "note" || i.type === "text"))
      .forEach(i => items.push({
        id: i.id,
        kind: "note",
        kindLabel: i.type,
        title: i.title,
        summary: "#"+i.tag,
        author: i.author,
        addedAt: (i.capturedAt || "").slice(0, 10),
        tags: [i.tag],
      }));
    return items;
  }, [data]);

  const counts = useKMemo(() => {
    const c = { all: entries.length };
    for (const e of entries) c[e.kind] = (c[e.kind]||0)+1;
    return c;
  }, [entries]);

  const filtered = useKMemo(() => {
    return entries.filter(e => {
      if (kind !== "all" && e.kind !== kind) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!e.title.toLowerCase().includes(q) &&
            !(e.author||"").toLowerCase().includes(q) &&
            !(e.summary||"").toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b) => (b.addedAt||"").localeCompare(a.addedAt||""));
  }, [entries, kind, query]);

  return (
    <div className="kbase">
      <div className="kbase__head">
        <h2>Knowledge</h2>
        <p className="kbase__sub">
          Everything you've put in the wiki. {entries.length} entries across topics, sources, claims, and notes.
        </p>

        <div className="kbase__filters">
          <div className="kbase__chips">
            {[
              ["all", "all", counts.all],
              ["topic", "topics", counts.topic||0],
              ["source", "sources", counts.source||0],
              ["claim", "claims", counts.claim||0],
              ["note", "notes", counts.note||0],
            ].map(([k,lbl,n])=>(
              <button key={k}
                className={"kbase__chip "+(kind===k?"active":"")}
                onClick={()=>setKind(k)}>
                {lbl} <span className="n">{n}</span>
              </button>
            ))}
          </div>
          <div className="kbase__search">
            <span className="pr">⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="filter by title, author, or url…" />
            {query && <button className="x" onClick={()=>setQuery("")}>✕</button>}
          </div>
        </div>
      </div>

      <div className="klist">
        {filtered.length === 0 && (
          <div className="klist__empty">no entries match.</div>
        )}
        {filtered.map(e => (
          <div key={e.kind+"-"+e.id} className="krow" onClick={()=>openNode(e.id)}>
            <div className="krow__kind">
              <span className={"kdot "+e.kind} />
              <span className="lbl">{e.kindLabel}</span>
            </div>
            <div className="krow__main">
              <div className="krow__title">{e.title}</div>
              <div className="krow__sub">{e.summary}</div>
            </div>
            <div className="krow__author">{e.author}</div>
            <div className="krow__date">{e.addedAt}</div>
            <div className="krow__tags">
              {e.tags.filter(Boolean).slice(0,2).map((t,i)=>(<span key={i} className="ktag">{t}</span>))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sourceAuthor(data, srcId) {
  const s = data.sources.find(x => x.id === srcId);
  return s ? s.author : "—";
}

Object.assign(window, { KnowledgeView });
