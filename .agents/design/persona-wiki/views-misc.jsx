/* global React, StatusPill, fmtDate */
/* Loka — Inbox / Review / Canvas / Reports / Labs / Repos */

const { useState: useMState, useMemo: useMMemo } = React;

/* ============================================================
   INBOX
   ============================================================ */
function InboxView({ data, openNode }) {
  const [filter, setFilter] = useMState("all");
  const [platform, setPlatform] = useMState("all");
  const [selected, setSelected] = useMState(null);

  const items = useMMemo(() => {
    return data.inbox.filter(i => {
      if (filter !== "all" && i.status !== filter) return false;
      if (platform !== "all" && i.platform !== platform) return false;
      return true;
    });
  }, [data, filter, platform]);

  const counts = useMMemo(() => {
    const c = { all: data.inbox.length };
    for (const i of data.inbox) c[i.status] = (c[i.status]||0)+1;
    return c;
  }, [data]);

  return (
    <div>
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>status</span>
        {[["all","all"],["captured","captured"],["triaged","triaged"],["ingested","ingested"],["needs-review","review"],["archived","archived"]].map(([k,lbl])=>(
          <button key={k} className={"filter "+(filter===k?"active":"")} onClick={()=>setFilter(k)}>
            {lbl} · {counts[k]||0}
          </button>
        ))}
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase", paddingLeft:14, borderLeft:"1px solid var(--border)", marginLeft:6}}>platform</span>
        {["all","manual","x","reddit","codex","claude"].map(p=>(
          <button key={p} className={"filter "+(platform===p?"active":"")} onClick={()=>setPlatform(p)}>{p}</button>
        ))}
        <span className="spacer" />
        <button className="filter">+ capture</button>
        <button className="filter" style={{color:"var(--accent)", borderColor:"var(--accent-line)"}}>ingest selected</button>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th style={{width:32}}>#</th>
            <th style={{width:120}}>captured</th>
            <th style={{width:80}}>type</th>
            <th>title</th>
            <th style={{width:140}}>author</th>
            <th style={{width:100}}>tag</th>
            <th style={{width:100}}>platform</th>
            <th style={{width:90}}>status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={i.id} className={selected===i.id?"selected":""} onClick={()=>setSelected(i.id)}>
              <td className="id">{String(n+1).padStart(3,"0")}</td>
              <td className="ts">{fmtDate(i.capturedAt)}</td>
              <td><span className="pill dim">{i.type}</span></td>
              <td className="title">{i.title}</td>
              <td>{i.author}</td>
              <td><span className="tag">#{i.tag}</span></td>
              <td>{i.platform}</td>
              <td><StatusPill status={i.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{padding:"10px 18px", fontSize:10.5, color:"var(--text-3)", borderTop:"1px solid var(--hairline)"}}>
        {items.length} of {data.inbox.length} items · append-only · last sync 2m ago
      </div>
    </div>
  );
}

/* ============================================================
   REVIEW QUEUE
   ============================================================ */
function ReviewView({ data }) {
  return (
    <div className="review">
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>review queue</span>
        <span className="pill dim">{data.review.length} open</span>
        <span className="pill warn">2 stale</span>
        <span className="spacer" />
        <button className="filter">run lint</button>
        <button className="filter" style={{color:"var(--accent)", borderColor:"var(--accent-line)"}}>approve all safe</button>
      </div>

      <div style={{padding:"10px 18px", display:"grid", gridTemplateColumns:"110px 1fr 100px 90px 220px", gap:14, fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--text-4)", borderBottom:"1px solid var(--border)"}}>
        <div>kind</div>
        <div>subject</div>
        <div>confidence</div>
        <div>age</div>
        <div style={{textAlign:"right"}}>actions</div>
      </div>

      {data.review.map(r => {
        const kindMap = {
          "duplicate":      ["dup",  "DUP"],
          "contradiction":  ["con",  "CONTR"],
          "weak-edge":      ["weak", "WEAK"],
          "stale-claim":    ["stale","STALE"],
          "unprocessed":    ["unpr", "UNPR"],
          "missing-source": ["miss", "MISS"],
          "risky-merge":    ["risk", "RISK"],
        };
        const [k,lbl] = kindMap[r.kind] || ["weak","?"];
        return (
          <div className="review__row" key={r.id}>
            <div><span className={"kind "+k}>{lbl}</span></div>
            <div className="subj">{r.subject}</div>
            <div className="meta"><span className={"pill "+(r.confidence==="high"?"accent":r.confidence==="medium"?"info":"dim")}>{r.confidence}</span></div>
            <div className="meta">{r.age} · {r.proposedBy}</div>
            <div className="acts">
              <button>reject</button>
              <button>investigate</button>
              <button className="ok">approve</button>
            </div>
          </div>
        );
      })}

      <div style={{padding:"30px 22px", color:"var(--text-3)", fontSize:11.5, borderTop:"1px solid var(--hairline)"}}>
        <div style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase", paddingBottom:8}}>review rules</div>
        <div style={{maxWidth:"70ch"}}>
          Risky mutations (merges, deletions, contradictions) sit here until you approve. Safe mutations
          (adding sources, drafting summaries, tagging) flow directly into the graph and show up in the timeline.
          Lint runs nightly at 21:00 WIB.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CANVAS
   ============================================================ */
function CanvasView({ data }) {
  const cards = [
    { id:"c1", x:60,  y:60,  kind:"topic", ct:"topic",     tt:"Personal wiki",                                   meta:"weight 0.62" },
    { id:"c2", x:340, y:40,  kind:"q",     ct:"question",  tt:"What enters first — capture, or graph link?",     meta:"open · 2d" },
    { id:"c3", x:340, y:170, kind:"src",   ct:"source",    tt:"karpathy/llm-wiki — gist",                        meta:"trust high" },
    { id:"c4", x:620, y:50,  kind:"note",  ct:"decision",  tt:"Use Cytoscape for v1 graph",                      meta:"≤500 nodes/1500 edges per view" },
    { id:"c5", x:620, y:200, kind:"topic", ct:"subtopic",  tt:"HTML artifacts > markdown",                       meta:"supports · medium" },
    { id:"c6", x:80,  y:240, kind:"note",  ct:"insight",   tt:"Most RAG re-discovers the same knowledge",        meta:"claim-005 · high" },
    { id:"c7", x:380, y:330, kind:"src",   ct:"brainstorm",tt:"Codex session — Loka UX",                         meta:"5 tasks extracted" },
    { id:"c8", x:90,  y:430, kind:"q",     ct:"open",      tt:"What does ‘stale’ look like for Books?",           meta:"unresolved" },
    { id:"c9", x:660, y:380, kind:"note",  ct:"todo",      tt:"Add canvas → graph bidirectional sync",           meta:"phase 2" },
    { id:"c10",x:380, y:480, kind:"topic", ct:"topic",     tt:"Coding agents",                                   meta:"weight 0.85" },
  ];
  // simple edges (visual only)
  const edges = [
    ["c1","c2"],["c1","c3"],["c2","c4"],["c3","c5"],["c5","c1"],
    ["c1","c6"],["c6","c7"],["c7","c10"],["c8","c1"],["c4","c9"],
  ];
  const center = id => {
    const c = cards.find(x=>x.id===id);
    return { x: c.x + 110, y: c.y + 38 };
  };

  return (
    <div className="canvas">
      <div className="canvas__hud">
        <span className="b active">personal-wiki·architecture</span>
        <span className="b">china-frontier·map</span>
        <span className="b">thinking-loop</span>
        <span className="b">+ new board</span>
      </div>

      <svg style={{position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none"}}>
        {edges.map(([a,b], i)=>{
          const pa = center(a), pb = center(b);
          return (
            <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke="rgba(163,230,53,0.25)" strokeWidth="1" strokeDasharray="3,3" />
          );
        })}
      </svg>

      {cards.map(c => (
        <div key={c.id} className={"ccard "+c.kind} style={{left: c.x, top: c.y}}>
          <div className="ct">{c.ct}</div>
          <div className="tt">{c.tt}</div>
          <div className="meta">{c.meta}</div>
        </div>
      ))}

      <div style={{position:"absolute", bottom:14, left:16, fontSize:10.5, color:"var(--text-3)", background:"var(--surface)", border:"1px solid var(--border)", padding:"6px 10px"}}>
        canvas · {cards.length} cards · {edges.length} edges · drag to rearrange · stored as <span style={{color:"var(--text-2)"}}>canvas/boards/personal-wiki-architecture.json</span>
      </div>
    </div>
  );
}

/* ============================================================
   REPORTS
   ============================================================ */
function ReportsView({ data }) {
  return (
    <div className="rep">
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>reports</span>
        <span className="pill dim">{data.reports.length} compiled</span>
        <span className="spacer" />
        <button className="filter">+ new report</button>
        <button className="filter" style={{color:"var(--accent)", borderColor:"var(--accent-line)"}}>render weekly</button>
      </div>
      {data.reports.map(r => (
        <div key={r.id} className="rep__row">
          <div>
            <div className="title">{r.title}</div>
            <div className="sub">{r.summary}</div>
            <div style={{paddingTop:8, display:"flex", gap:10, color:"var(--text-4)", fontSize:10}}>
              <span>{r.date}</span>
              <span>·</span>
              <span>auto-compiled · agent·codex</span>
            </div>
          </div>
          <div className="stats">
            <b>{r.sources}</b>sources<br/>
            <span style={{color:"var(--accent)"}}>+{r.newEdges} edges</span> · {r.claims} claims
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   LABS
   ============================================================ */
function LabsView({ data, openNode }) {
  return (
    <div>
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>labs</span>
        <span className="pill dim">{data.labs.length} tracked</span>
        <span className="pill accent">3 watchlist</span>
        <span className="spacer" />
        <button className="filter">us</button>
        <button className="filter active">all</button>
        <button className="filter">cn</button>
        <button className="filter">uk</button>
      </div>
      <table className="tbl">
        <thead><tr><th>lab</th><th>country</th><th>focus</th><th>repos</th><th>last 7d</th><th></th></tr></thead>
        <tbody>
          {data.labs.map(l => (
            <tr key={l.id}>
              <td className="title"><b>{l.label}</b></td>
              <td>{l.country}</td>
              <td>{l.focus}</td>
              <td className="num">{l.repos}</td>
              <td><span style={{width:120, display:"inline-block"}}><span className="bar"><i style={{width:`${30+Math.random()*60}%`}} /></span></span></td>
              <td><span className="pill dim">→ open</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   REPOS
   ============================================================ */
function ReposView({ data, openNode }) {
  return (
    <div>
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>repos</span>
        <span className="pill dim">{data.repos.length} tracked</span>
        <span className="spacer" />
        <button className="filter">+ track repo</button>
      </div>
      <table className="tbl">
        <thead><tr><th>repo</th><th>lab</th><th>topic</th><th>lang</th><th>stars</th><th>7d</th><th>pushed</th></tr></thead>
        <tbody>
          {data.repos.map(r => {
            const tlabel = (data.topics.find(t=>t.id===r.topic)||{}).label || "?";
            return (
              <tr key={r.id} onClick={()=>openNode(r.topic)}>
                <td className="title"><b>{r.label}</b></td>
                <td>{r.lab}</td>
                <td><span className="tag">{tlabel}</span></td>
                <td>{r.lang}</td>
                <td className="num">{r.stars}</td>
                <td className="num" style={{color:"var(--accent)"}}>{r.d7}</td>
                <td className="ts">{r.pushed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   TOPICS LIST (simple)
   ============================================================ */
function TopicsView({ data, openNode }) {
  return (
    <div>
      <div className="toolbar">
        <span style={{color:"var(--text-4)", fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase"}}>topics</span>
        <span className="pill dim">{data.topics.length}</span>
        <span className="spacer" />
        <button className="filter">+ new topic</button>
      </div>
      <table className="tbl">
        <thead><tr><th>topic</th><th>status</th><th>weight</th><th>sources</th><th>claims</th><th>backlinks</th></tr></thead>
        <tbody>
          {data.topics.map(t => (
            <tr key={t.id} onClick={()=>openNode(t.id)}>
              <td className="title"><b>{t.label}</b><div style={{fontSize:10.5, color:"var(--text-3)", paddingTop:2}}>{t.summary}</div></td>
              <td><span className={"pill "+(t.status==="watchlist"?"accent":t.status==="project"?"purple":"dim")}>{t.status}</span></td>
              <td className="num">{t.weight.toFixed(2)}</td>
              <td className="num">{t.sources}</td>
              <td className="num">{t.claims}</td>
              <td className="num">{t.backlinks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { InboxView, ReviewView, CanvasView, ReportsView, LabsView, ReposView, TopicsView });
