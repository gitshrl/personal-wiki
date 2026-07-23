/* global React, ReactDOM, LOKA_DATA,
   HomeView, PageView, GraphView,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor */

const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "lime"
}/*EDITMODE-END*/;

const PINNED = [
  { id: "topic-markets",       kind: "topic",   label: "Markets" },
  { id: "topic-portfolio",     kind: "topic",   label: "Portfolio" },
  { id: "person-karpathy",     kind: "person",  label: "Andrej Karpathy" },
  { id: "src-karpathy-wiki",   kind: "article", label: "karpathy/llm-wiki" },
  { id: "ib-fin-5",            kind: "article", label: "trim ETH 2% → 1%" },
];

function App() {
  const data = LOKA_DATA;
  const [view, setView] = useState("home"); // "home" | "page" | "graph"
  const [openId, setOpenId] = useState(null);
  const [graphFocus, setGraphFocus] = useState("topic-markets");
  const searchRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [groupOpen, setGroupOpen] = useState({ topic: true, article: true, person: true, agent: true, org: true });
  const [ask, setAsk] = useState(null); // { question, answer, loading, error }
  // navigation history (lightweight back/forward)
  const [history, setHistory] = useState([{ view: "home", openId: null }]);
  const [hIdx, setHIdx] = useState(0);

  function navigate(next) {
    // next: { view, openId? }
    const cur = history[hIdx];
    if (cur && cur.view === next.view && cur.openId === (next.openId||null)) return;
    const trimmed = history.slice(0, hIdx + 1);
    const newHistory = [...trimmed, { view: next.view, openId: next.openId || null }];
    setHistory(newHistory);
    setHIdx(newHistory.length - 1);
    setView(next.view);
    if (next.openId !== undefined) setOpenId(next.openId);
  }
  function goBack() {
    if (hIdx <= 0) return;
    const i = hIdx - 1;
    const e = history[i];
    setHIdx(i);
    setView(e.view);
    setOpenId(e.openId);
    if (e.openId) setGraphFocus(e.openId);
  }
  function goForward() {
    if (hIdx >= history.length - 1) return;
    const i = hIdx + 1;
    const e = history[i];
    setHIdx(i);
    setView(e.view);
    setOpenId(e.openId);
    if (e.openId) setGraphFocus(e.openId);
  }

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Knowledge entries — unified shape for tree + palette
  const entries = useMemo(() => buildEntries(data), [data]);

  function openEntry(id) {
    if (!id) return;
    if (id === "home")  { navigate({ view: "home",  openId: null }); return; }
    if (id === "graph") { navigate({ view: "graph", openId: null }); return; }
    setGraphFocus(id);
    navigate({ view: "page", openId: id });
  }
  function setViewNav(v) { navigate({ view: v, openId: null }); }

  // global hotkeys
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
        searchRef.current && searchRef.current.select();
      }
      // Cmd/Ctrl + [ → back, ] → forward (mac-style)
      if (mod && e.key === "[") { e.preventDefault(); goBack(); }
      if (mod && e.key === "]") { e.preventDefault(); goForward(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hIdx, history]);

  // Resolve the open entry (for breadcrumb + context)
  const openEntryObj = useMemo(() => {
    if (view !== "page") return null;
    return entries.find(e => e.id === openId) || null;
  }, [view, openId, entries]);

  const crumb = useMemo(() => {
    if (view === "home")  return ["Home"];
    if (view === "graph") return ["Graph"];
    if (openEntryObj)     return [openEntryObj.kind, openEntryObj.title];
    return ["—"];
  }, [view, openEntryObj]);

  return (
    <div className="app"
         data-theme={tweaks.theme}
         data-accent={tweaks.accent}>

      {/* TOP */}
      <header className="cmd">
        <div className="cmd__brand" onClick={()=>setViewNav("home")} style={{cursor:"pointer"}}>
          <span className="dot" />
          <span className="name">Personal wiki</span>
        </div>
        <div className="cmd__center">
          <div className="cmd__nav-btns">
            <button className="cmd__navbtn" disabled={hIdx<=0} onClick={goBack} title="Back (⌘[)">←</button>
            <button className="cmd__navbtn" disabled={hIdx>=history.length-1} onClick={goForward} title="Forward (⌘])">→</button>
          </div>
          <div className="cmd__crumb">
            {crumb.map((c, i) => (
              <React.Fragment key={i}>
                {i>0 && <span className="sep">›</span>}
                <span className={i===crumb.length-1?"here":""}>{c}</span>
              </React.Fragment>
            ))}
          </div>
          <SearchBar inputRef={searchRef} entries={entries} openEntry={openEntry} setView={setViewNav}
            onAsk={(question) => runAsk(question, entries, setAsk)} />
        </div>
        <div className="cmd__actions">
          <button className={"cmd__btn "+(view==="graph"?"primary":"")} onClick={()=>setViewNav("graph")} title="Graph">
            ✺
          </button>
        </div>
      </header>

      {/* MID */}
      <div className="app__mid">

        {/* SIDEBAR */}
        <aside className="side">
          <div className="side__search">
            <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="filter notes…" />
          </div>

          <div className="side__tree">
            <div className="tree__section">PINNED</div>
            <TreeGroup label="" itemCount={PINNED.length} alwaysOpen flush>
              {PINNED.map(p => (
                <TreeItem key={p.id} kind={p.kind} label={p.label}
                          active={view==="page" && openId===p.id}
                          onClick={()=>openEntry(p.id)} />
              ))}
            </TreeGroup>

            <div className="tree__section">ENTITIES</div>
            {[
              ["article", "Articles"],
              ["topic",   "Topics"],
              ["person",  "Persons"],
              ["agent",   "Agents"],
              ["org",     "Orgs"],
            ].map(([kind, label]) => {
              const items = entries
                .filter(e => e.kind === kind)
                .filter(e => !filter || e.title.toLowerCase().includes(filter.toLowerCase()));
              return (
                <TreeGroup
                  key={kind}
                  label={label}
                  itemCount={items.length}
                  open={groupOpen[kind]}
                  onToggle={()=>setGroupOpen(g=>({...g, [kind]: !g[kind]}))}>
                  {items.map(item => (
                    <TreeItem key={item.id}
                              kind={item.kind}
                              label={item.title}
                              active={view==="page" && openId===item.id}
                              onClick={()=>openEntry(item.id)} />
                  ))}
                  {items.length === 0 && (
                    <div className="tree__empty">no matches</div>
                  )}
                </TreeGroup>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="main__body">
            {view === "home"  && <HomeView  data={data} entries={entries} openEntry={openEntry} />}
            {view === "graph" && <GraphView data={data} focusId={graphFocus} entries={entries} setFocus={setGraphFocus} openEntry={openEntry} />}
            {view === "page"  && openEntryObj && <PageView data={data} entry={openEntryObj} entries={entries} openEntry={openEntry} />}
            {view === "page"  && !openEntryObj && (
              <div style={{padding:80, color:"var(--text-3)"}}>nothing selected.</div>
            )}
          </div>
        </main>
      </div>

      {/* STATUS */}
      <footer className="status">
        <span>{entries.length} entries · {data.graph.edges.length} links</span>
        <span className="right">
          <span>synced 2m ago</span>
        </span>
      </footer>

      {ask && <AskPanel ask={ask} setAsk={setAsk} entries={entries} openEntry={openEntry} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="mode" value={tweaks.theme} onChange={v=>setTweak('theme', v)} options={[
            { label: "dark", value: "dark" },
            { label: "midnight", value: "midnight" },
            { label: "sepia", value: "sepia" },
          ]} />
          <TweakColor label="accent" value={tweaks.accent} onChange={v=>setTweak('accent', v)}
            options={["lime","cyan","amber","rose","white"]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ============================================================
   SearchBar — inline live search + ask LLM
   ============================================================ */
function SearchBar({ inputRef, entries, openEntry, setView, onAsk }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const wrapRef = useRef(null);

  // close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const baseItems = useMemo(() => {
    const cmds = [
      { id: "home",  kind: "cmd", label: "Go to Home", hint: "" },
      { id: "graph", kind: "cmd", label: "Open Graph", hint: "" },
    ];
    const all = entries.map(e => ({
      id: e.id, kind: e.kind, label: e.title, hint: e.author || e.sourceType || ""
    }));
    return [...cmds, ...all];
  }, [entries]);

  const filtered = useMemo(() => {
    if (!q) return baseItems.slice(0, 8);
    const lower = q.toLowerCase();
    const hits = baseItems.filter(i =>
      i.label.toLowerCase().includes(lower) ||
      (i.hint||"").toLowerCase().includes(lower) ||
      i.kind.includes(lower)
    ).slice(0, 10);
    // always offer "ask" at top when there's a query
    return [{ id: "__ask__", kind: "ask", label: `Ask Loka: "${q}"`, hint: "natural language" }, ...hits];
  }, [baseItems, q]);

  function pick(i) {
    if (!filtered[i]) return;
    const it = filtered[i];
    if (it.id === "__ask__") {
      onAsk(q);
      setOpen(false);
      setQ("");
      inputRef.current && inputRef.current.blur();
      return;
    }
    setOpen(false);
    setQ("");
    inputRef.current && inputRef.current.blur();
    if (it.id === "home")  return setView("home");
    if (it.id === "graph") return setView("graph");
    openEntry(it.id);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s+1, filtered.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s-1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
    else if (e.key === "Escape") { e.preventDefault(); setQ(""); setOpen(false); inputRef.current && inputRef.current.blur(); }
  }

  useEffect(() => { setSel(0); }, [q]);

  return (
    <div className={"cmd__search "+(open?"active":"")} ref={wrapRef}>
      <span className="pr">⌕</span>
      <input
        ref={inputRef}
        value={q}
        onChange={e=>{ setQ(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search or ask anything…"
      />
      <span className="kbd">⌘K</span>

      {open && (
        <div className="cmd__results">
          {filtered.length === 0 ? (
            <div className="cmd__empty">no matches.</div>
          ) : (
            filtered.map((it, i) => (
              <div key={i}
                   className={"cmd__result "+(i===sel?"sel":"")+(it.kind==="ask"?" cmd__result--ask":"")}
                   onMouseEnter={()=>setSel(i)}
                   onMouseDown={(e)=>{ e.preventDefault(); pick(i); }}>
                <span className={"dot "+it.kind} />
                <span className="grp">{it.kind==="ask"?"AI":it.kind}</span>
                <span className="nm">{it.label}</span>
                <span className="hint">{it.hint}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Tree primitives
   ============================================================ */
function TreeGroup({ label, itemCount, open, onToggle, alwaysOpen, flush, children }) {
  const isOpen = alwaysOpen || open;
  return (
    <div className={"tree__group "+(flush?"flush":"")}>
      {label && (
        <div className="tree__group-head" onClick={alwaysOpen ? undefined : onToggle}>
          {!alwaysOpen && <span className="caret">{isOpen ? "▾" : "▸"}</span>}
          {alwaysOpen && <span className="caret" />}
          <span className="lbl">{label}</span>
          <span className="ct">{itemCount}</span>
        </div>
      )}
      {isOpen && children}
    </div>
  );
}

function TreeItem({ kind, label, active, onClick }) {
  return (
    <div className={"tree__item "+(active?"active":"")} onClick={onClick}>
      <span className={"dot "+kind} />
      <span className="lbl">{label}</span>
    </div>
  );
}

/* ============================================================
   Knowledge entries (unified shape)
   ============================================================ */
function buildEntries(data) {
  const out = [];
  const bodies = data.bodies || {};
  data.topics.forEach(t => out.push({
    id: t.id,
    kind: "topic",
    title: t.label,
    summary: t.summary,
    body: bodies[t.id],
    author: "you",
    addedAt: "—",
    status: t.status,
    weight: t.weight,
    backlinks: t.backlinks,
  }));
  // Persons / authors — first-class pages
  data.graph.nodes.filter(n => n.type === "person").forEach(p => out.push({
    id: p.id,
    kind: "person",
    title: p.label,
    weight: p.weight,
    body: bodies[p.id],
    addedAt: "—",
  }));
  // Agents — Claude, Codex, You (creators of notes/articles)
  data.graph.nodes.filter(n => n.type === "agent").forEach(a => out.push({
    id: a.id,
    kind: "agent",
    title: a.label,
    weight: a.weight,
    body: bodies[a.id],
    addedAt: "—",
  }));
  // Orgs / affiliations
  data.graph.nodes.filter(n => n.type === "org").forEach(o => out.push({
    id: o.id,
    kind: "org",
    title: o.label,
    weight: o.weight,
    body: bodies[o.id],
    addedAt: "—",
  }));
  // Articles: external sources + your own notes/decisions, unified
  data.sources.forEach(s => out.push({
    id: s.id,
    kind: "article",
    title: s.title,
    url: s.url,
    author: s.author,
    sourceType: s.type,
    addedAt: (s.fetched||"").slice(0,10),
    trust: s.trust,
    body: bodies[s.id],
    isOwn: false,
  }));
  data.inbox
    .filter(i => i.status === "ingested" && (i.type === "note" || i.type === "text"))
    .forEach(i => out.push({
      id: i.id,
      kind: "article",
      title: i.title,
      tag: i.tag,
      author: i.author,
      sourceType: i.type,
      addedAt: (i.capturedAt||"").slice(0,10),
      body: bodies[i.id],
      isOwn: true,
    }));
  return out;
}

/* ============================================================
   Context Panel
   ============================================================ */
function ContextPanel({ data, view, entry, graphFocus, entries, openEntry }) {
  if (view === "home")  return <HomeCtx data={data} entries={entries} openEntry={openEntry} />;
  if (view === "graph") {
    const e = entries.find(x => x.id === graphFocus);
    return e ? <EntityCtx data={data} entry={e} entries={entries} openEntry={openEntry} />
             : <HomeCtx data={data} entries={entries} openEntry={openEntry} />;
  }
  if (view === "page" && entry) return <EntityCtx data={data} entry={entry} entries={entries} openEntry={openEntry} />;
  return null;
}

function HomeCtx({ data, entries, openEntry }) {
  const topics = entries.filter(e=>e.kind==="topic").sort((a,b)=>(b.weight||0)-(a.weight||0)).slice(0,6);
  return (
    <div className="ctx__block">
      <div className="ctx__head"><span>by weight</span></div>
      {topics.map(t => (
        <div key={t.id} className="ctx__link" onClick={()=>openEntry(t.id)}>
          <span className="ico">●</span>
          <span className="lbl">{t.title}</span>
          <span className="type">{t.weight.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function EntityCtx({ data, entry, entries, openEntry }) {
  // backlinks: edges into / out of this id
  const inEdges  = data.graph.edges.filter(e => e.to   === entry.id);
  const outEdges = data.graph.edges.filter(e => e.from === entry.id);

  return (
    <>
      <div className="ctx__block">
        <div className="ctx__head"><span>properties</span></div>
        <div className="ctx__row"><span className="k">kind</span><span className="v">{entry.kind}</span></div>
        {entry.sourceType && <div className="ctx__row"><span className="k">type</span><span className="v">{entry.sourceType}</span></div>}
        {entry.author && <div className="ctx__row"><span className="k">author</span><span className="v">{entry.author}</span></div>}
        {entry.addedAt && entry.addedAt !== "—" && <div className="ctx__row"><span className="k">added</span><span className="v">{entry.addedAt}</span></div>}
        {entry.status && <div className="ctx__row"><span className="k">status</span><span className="v">{entry.status}</span></div>}
        {entry.confidence && <div className="ctx__row"><span className="k">confidence</span><span className="v">{entry.confidence}</span></div>}
        {entry.trust && <div className="ctx__row"><span className="k">trust</span><span className="v">{entry.trust}</span></div>}
        {entry.weight!=null && <div className="ctx__row"><span className="k">weight</span><span className="v">{entry.weight.toFixed(2)}</span></div>}
        {entry.tag && <div className="ctx__row"><span className="k">tag</span><span className="v">#{entry.tag}</span></div>}
        {entry.url && (
          <div className="ctx__row"><span className="k">url</span><span className="v" style={{fontSize:11, color:"var(--link)", overflow:"hidden", textOverflow:"ellipsis"}}>{entry.url}</span></div>
        )}
        <div className="ctx__row"><span className="k">id</span><span className="v" style={{fontSize:11, color:"var(--text-3)", fontFamily:"var(--mono)"}}>{entry.id}</span></div>
      </div>

      <div className="ctx__block">
        <div className="ctx__head">
          <span>backlinks</span>
          <span className="more">{inEdges.length}</span>
        </div>
        {inEdges.length === 0 && <div style={{color:"var(--text-4)", fontSize:11}}>none</div>}
        {inEdges.slice(0, 10).map((e, i) => {
          const n = entries.find(x => x.id === e.from);
          if (!n) return null;
          return (
            <div key={i} className="ctx__link" onClick={()=>openEntry(e.from)}>
              <span className="ico">←</span>
              <span className="lbl">{n.title}</span>
              <span className="type">{e.type}</span>
            </div>
          );
        })}
      </div>

      <div className="ctx__block">
        <div className="ctx__head">
          <span>outgoing</span>
          <span className="more">{outEdges.length}</span>
        </div>
        {outEdges.length === 0 && <div style={{color:"var(--text-4)", fontSize:11}}>none</div>}
        {outEdges.slice(0, 10).map((e, i) => {
          const n = entries.find(x => x.id === e.to);
          if (!n) return null;
          return (
            <div key={i} className="ctx__link" onClick={()=>openEntry(e.to)}>
              <span className="ico">→</span>
              <span className="lbl">{n.title}</span>
              <span className="type">{e.type}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================
   Command Palette
   ============================================================ */
function Palette({ entries, close, openEntry, setView }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const all = useMemo(() => {
    const items = entries.map(e => ({
      id: e.id, kind: e.kind, label: e.title, hint: e.author || e.sourceType || ""
    }));
    items.unshift(
      { id: "home",  kind: "cmd", label: "Home",       hint: "" },
      { id: "graph", kind: "cmd", label: "Open graph", hint: "" },
    );
    return items;
  }, [entries]);

  const filtered = useMemo(() => {
    if (!q) return all.slice(0, 14);
    const lower = q.toLowerCase();
    return all.filter(i =>
      i.label.toLowerCase().includes(lower) ||
      (i.hint||"").toLowerCase().includes(lower) ||
      i.kind.includes(lower)
    ).slice(0, 16);
  }, [all, q]);

  function pick(i) {
    if (!filtered[i]) return;
    const it = filtered[i];
    close();
    if (it.id === "home")  return setView("home");
    if (it.id === "graph") return setView("graph");
    openEntry(it.id);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s+1, filtered.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s-1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
  }

  useEffect(() => { setSel(0); }, [q]);

  return (
    <div className="palette__bg" onClick={close}>
      <div className="palette" onClick={e=>e.stopPropagation()}>
        <div className="palette__in">
          <span className="pr">⌕</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey}
            placeholder="search anything…" />
          <span className="kbd">esc</span>
        </div>
        <div className="palette__list">
          {filtered.map((it, i) => (
            <div key={i} className={"palette__row "+(i===sel?"sel":"")}
                 onMouseEnter={()=>setSel(i)}
                 onClick={()=>pick(i)}>
              <span className={"dot "+it.kind} />
              <span className="grp">{it.kind}</span>
              <span className="nm">{it.label}</span>
              <span className="hint">{it.hint}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{padding:"24px", color:"var(--text-3)", textAlign:"center", fontSize:13}}>
              no matches.
            </div>
          )}
        </div>
        <div className="palette__foot">
          <div><span className="kbd">↑↓</span> nav <span className="kbd">↵</span> open <span className="kbd">esc</span> close</div>
          <div>{filtered.length} of {all.length}</div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

/* ============================================================
   Ask Loka — natural-language query → window.claude.complete
   ============================================================ */
async function runAsk(question, entries, setAsk) {
  setAsk({ question, answer: "", loading: true });

  // Build a compact wiki context: titles + 1-line summary per entry
  const ctx = entries.slice(0, 80).map(e => {
    const lead = (e.summary || e.body || "").split("\n")[0].slice(0, 140);
    return `[${e.kind}] ${e.title}${lead ? " — " + lead : ""}`;
  }).join("\n");

  const prompt = `You are Loka, the user's personal knowledge wiki. Answer the user's question using ONLY the wiki entries below. Cite entries by their exact Title in [[double brackets]] so the UI can link them. Be concise (3-5 sentences). If the wiki has nothing relevant, say so plainly.

WIKI ENTRIES:
${ctx}

QUESTION: ${question}

ANSWER:`;

  try {
    const text = await window.claude.complete(prompt);
    setAsk({ question, answer: text, loading: false });
  } catch (err) {
    setAsk({ question, answer: "", loading: false, error: String(err) });
  }
}

function AskPanel({ ask, setAsk, entries, openEntry }) {
  // ESC to close
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setAsk(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAsk]);

  // Find cited entries from [[wikilinks]] in answer
  const cited = useMemo(() => {
    if (!ask.answer) return [];
    const titleMap = new Map(entries.map(e => [e.title.toLowerCase(), e]));
    const re = /\[\[([^\]]+)\]\]/g;
    const found = new Map();
    let m;
    while ((m = re.exec(ask.answer)) !== null) {
      const t = titleMap.get(m[1].toLowerCase());
      if (t) found.set(t.id, t);
    }
    return [...found.values()];
  }, [ask.answer, entries]);

  function renderAnswer(text) {
    // Inline-render [[Title]] as clickable
    const titleMap = new Map(entries.map(e => [e.title.toLowerCase(), e]));
    const out = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let last = 0, m, k = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const target = titleMap.get(m[1].toLowerCase());
      out.push(target
        ? <a key={k++} className="wikilink" onClick={()=>{ openEntry(target.id); setAsk(null); }}>{m[1]}</a>
        : <span key={k++} className="wikilink wikilink--missing">{m[1]}</span>);
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  return (
    <div className="ask__bg" onClick={()=>setAsk(null)}>
      <div className="ask" onClick={(e)=>e.stopPropagation()}>
        <div className="ask__hd">
          <div className="ask__pill">Ask Loka</div>
          <button className="ask__x" onClick={()=>setAsk(null)}>✕</button>
        </div>
        <div className="ask__q">{ask.question}</div>
        <div className="ask__a">
          {ask.loading && <div className="ask__loading">thinking…</div>}
          {ask.error && <div className="ask__err">couldn't reach the model: {ask.error}</div>}
          {!ask.loading && !ask.error && ask.answer && (
            <div className="ask__answer">
              {ask.answer.split(/\n\n+/).map((p, i) => <p key={i}>{renderAnswer(p)}</p>)}
            </div>
          )}
        </div>
        {cited.length > 0 && (
          <div className="ask__cited">
            <div className="ask__cited-h">Cited from your wiki</div>
            <div className="ask__cited-list">
              {cited.map(e => (
                <div key={e.id} className="ask__cited-row" onClick={()=>{ openEntry(e.id); setAsk(null); }}>
                  <span className={"dot "+e.kind} />
                  <span>{e.title}</span>
                  <span className="kind">{e.kind}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
