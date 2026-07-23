/* global React */
/* Loka — Graph view (hand-rolled force-directed SVG) */

const { useEffect: useGEffect, useRef: useGRef, useState: useGState, useMemo: useGMemo } = React;

const TYPE_COLORS = {
  topic:     "var(--accent)",
  repo:      "var(--info)",
  lab:       "var(--purple)",
  source:    "var(--text-2)",
  person:    "#f97316",
  agent:     "#ec4899",
  org:       "#c084fc",
};

function GraphView({ data, focusId, setFocus, openEntry, entries }) {
  const entryIds = useGMemo(() => new Set((entries||[]).map(e=>e.id)), [entries]);
  const svgRef = useGRef(null);
  const [visibleTypes, setVisibleTypes] = useGState({
    topic: true, repo: true, lab: true, claim: true, source: true, person: true, brainstorm: true,
  });
  const [hover, setHover] = useGState(null);
  const [zoom, setZoom] = useGState(1);
  const [pan, setPan] = useGState({x:0, y:0});
  const [showLegend, setShowLegend] = useGState(false);
  const dragRef = useGRef(null);

  function onMouseDown(e) {
    if (e.target.tagName === "circle" || e.target.tagName === "text") return; // let node clicks pass
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    e.preventDefault();
  }
  function onMouseMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }
  function onMouseUp() { dragRef.current = null; }
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.max(0.3, Math.min(2.5, z + delta)));
  }

  useGEffect(() => {
    function up() { dragRef.current = null; }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Build node positions via simple force simulation (run once)
  const layout = useGMemo(() => {
    const W = 1000, H = 720;
    // Filter out claim-type nodes (legacy data) — claims are no longer surfaced.
    const filteredNodes = data.graph.nodes.filter(n => n.type !== "claim" && n.type !== "brainstorm");
    const keepIds = new Set(filteredNodes.map(n => n.id));
    const nodes = filteredNodes.map(n => ({
      ...n,
      x: W/2 + (Math.random()-0.5) * 400,
      y: H/2 + (Math.random()-0.5) * 300,
      vx: 0, vy: 0,
    }));
    const nIdx = new Map(nodes.map((n,i)=>[n.id, i]));
    const edges = data.graph.edges
      .filter(e => keepIds.has(e.from) && keepIds.has(e.to))
      .filter(e => nIdx.has(e.from) && nIdx.has(e.to))
      .map(e => ({...e, s: nIdx.get(e.from), t: nIdx.get(e.to)}));

    const ITER = 380;
    for (let it = 0; it < ITER; it++) {
      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx*dx + dy*dy + 0.01;
          let d = Math.sqrt(d2);
          if (d > 280) continue;
          const force = 5600 / d2;
          dx /= d; dy /= d;
          a.vx += dx * force; a.vy += dy * force;
          b.vx -= dx * force; b.vy -= dy * force;
        }
      }
      // spring (edges)
      for (const e of edges) {
        const a = nodes[e.s], b = nodes[e.t];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx*dx + dy*dy) + 0.01;
        const target = 110;
        const k = 0.018;
        const f = (d - target) * k;
        const ux = dx/d, uy = dy/d;
        a.vx += ux * f; a.vy += uy * f;
        b.vx -= ux * f; b.vy -= uy * f;
      }
      // center pull
      for (const n of nodes) {
        n.vx += (W/2 - n.x) * 0.0015;
        n.vy += (H/2 - n.y) * 0.0015;
      }
      // integrate
      const damp = 0.78;
      for (const n of nodes) {
        n.vx *= damp; n.vy *= damp;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 30) n.x = 30; if (n.x > W-30) n.x = W-30;
        if (n.y < 30) n.y = 30; if (n.y > H-30) n.y = H-30;
      }
    }
    return { nodes, edges, W, H };
  }, [data]);

  // counts per type
  const typeCounts = useGMemo(() => {
    const c = {};
    for (const n of data.graph.nodes) c[n.type] = (c[n.type]||0) + 1;
    return c;
  }, [data]);

  const focusNode = focusId ? layout.nodes.find(n=>n.id===focusId) : null;
  const focusEdges = focusNode
    ? layout.edges.filter(e => layout.nodes[e.s].id === focusNode.id || layout.nodes[e.t].id === focusNode.id)
    : [];
  const focusNeighbors = focusNode
    ? focusEdges.map(e => {
        const otherIdx = layout.nodes[e.s].id === focusNode.id ? e.t : e.s;
        const dir = layout.nodes[e.s].id === focusNode.id ? "→" : "←";
        return { node: layout.nodes[otherIdx], dir, type: e.type, confidence: e.confidence };
      })
    : [];

  const highlightSet = new Set();
  if (focusNode) {
    highlightSet.add(focusNode.id);
    focusNeighbors.forEach(n => highlightSet.add(n.node.id));
  }
  if (hover) {
    highlightSet.add(hover);
    layout.edges.forEach(e => {
      const a = layout.nodes[e.s].id, b = layout.nodes[e.t].id;
      if (a === hover) highlightSet.add(b);
      if (b === hover) highlightSet.add(a);
    });
  }

  function sizeFor(n) {
    if (n.type === "topic") return 10 + n.weight * 14;
    if (n.type === "lab")   return 8 + n.weight * 10;
    if (n.type === "repo")  return 6 + n.weight * 8;
    return 5 + n.weight * 6;
  }

  return (
    <div className="graph">
      <svg ref={svgRef} viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet"
           onMouseDown={onMouseDown}
           onMouseMove={onMouseMove}
           onMouseUp={onMouseUp}
           onWheel={onWheel}
           style={{cursor: dragRef.current ? "grabbing" : "grab"}}>
        <defs>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="0.6" cy="0.6" r="0.6" fill="rgba(120,130,140,0.10)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1000" height="720" fill="url(#dots)" />
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* edges */}
          {layout.edges.map((e, i) => {
            const a = layout.nodes[e.s], b = layout.nodes[e.t];
            if (!visibleTypes[a.type] || !visibleTypes[b.type]) return null;
            const isHL = highlightSet.size > 0 && highlightSet.has(a.id) && highlightSet.has(b.id);
            const isDim = highlightSet.size > 0 && !isHL;
            const stroke = isHL ? "var(--accent)" : isDim ? "rgba(150,140,120,0.10)" : "rgba(180,170,150,0.32)";
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={stroke} strokeWidth={isHL ? 1.4 : 0.8}
                opacity={isDim ? 0.4 : 1} />
            );
          })}
          {/* nodes */}
          {layout.nodes.map(n => {
            if (!visibleTypes[n.type]) return null;
            const r = sizeFor(n);
            const isHL = highlightSet.size === 0 || highlightSet.has(n.id);
            const isFocus = focusId === n.id;
            return (
              <g key={n.id}
                 transform={`translate(${n.x},${n.y})`}
                 style={{cursor:"pointer"}}
                 onMouseEnter={()=>{ setHover(n.id); setFocus && setFocus(n.id); }}
                 onMouseLeave={()=>setHover(null)}
                 onClick={()=>{
                   if (openEntry && entryIds.has(n.id)) openEntry(n.id);
                   else if (setFocus) setFocus(n.id);
                 }}>
                {isFocus && (
                  <circle cx="0" cy="0" r={r+5} fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.8" />
                )}
                <circle cx="0" cy="0" r={r}
                  className={"n-"+n.type}
                  opacity={isHL ? 0.95 : 0.25}
                  strokeWidth="0" />
                <text x={r+5} y={3}
                  fontSize={n.type==="topic"?11.5:10}
                  fontFamily="JetBrains Mono"
                  fill={isHL ? "var(--text)" : "var(--text-4)"}
                  opacity={isHL ? 1 : 0.4}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend toggle */}
      <button className="graph__legend-toggle" onClick={()=>setShowLegend(s=>!s)} title="Legend">
        {showLegend ? "✕" : "?"}
      </button>

      {/* Legend (off by default) */}
      {showLegend && (
        <div className="graph__legend">
          <div className="title">types</div>
          {Object.keys(TYPE_COLORS).map(t => (
            <div key={t} className="row">
              <span className={"sw sw-"+t} />
              <span className="lbl">{t}</span>
              <span className="ct">{typeCounts[t]||0}</span>
            </div>
          ))}
        </div>
      )}

      {/* HUD */}
      <div className="graph__hud">
        <div>nodes <b>{layout.nodes.length}</b></div>
        <div>edges <b>{layout.edges.length}</b></div>
        <div>zoom <b>{zoom.toFixed(2)}×</b></div>
        {focusNode && <div>focus <b>{focusNode.label}</b></div>}
      </div>

      {/* Zoom */}
      <div className="graph__zoom">
        <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.1))}>−</button>
        <button onClick={()=>{setZoom(1); setPan({x:0,y:0});}}>◯</button>
        <button onClick={()=>setZoom(z=>Math.min(2,z+0.1))}>+</button>
      </div>
    </div>
  );
}

Object.assign(window, { GraphView });
