/* global React */
/* Loka — unified entity page (topic, source, claim, note) */

/* Render an article body with [[wikilink]] support */
function Body({ body, entries, openEntry }) {
  if (!body) return null;
  const titleMap = new Map(entries.map(e => [e.title.toLowerCase(), e]));
  const paragraphs = body.split(/\n\n+/);
  return (
    <div className="prose">
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p, titleMap, openEntry)}</p>
      ))}
    </div>
  );
}

function renderInline(text, titleMap, openEntry) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*/g;
  let lastEnd = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) out.push(text.slice(lastEnd, m.index));
    if (m[1] != null) {
      const label = m[1];
      const target = titleMap.get(label.toLowerCase());
      out.push(target
        ? <a key={k++} className="wikilink" onClick={()=>openEntry(target.id)}>{label}</a>
        : <span key={k++} className="wikilink wikilink--missing">{label}</span>);
    } else if (m[2] != null) {
      out.push(<strong key={k++}>{m[2]}</strong>);
    }
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) out.push(text.slice(lastEnd));
  return out;
}

function PageLinks({ data, entry, entries, openEntry }) {
  // Derive links from [[wikilinks]] in body text + explicit graph edges (no types)
  const titleMap = new Map(entries.map(e => [e.title.toLowerCase(), e]));
  const linksOut = new Set();
  // From body wikilinks
  if (entry.body) {
    const re = /\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = re.exec(entry.body)) !== null) {
      const target = titleMap.get(m[1].toLowerCase());
      if (target && target.id !== entry.id) linksOut.add(target.id);
    }
  }
  // From explicit graph edges (kept for entities without bodies)
  data.graph.edges.forEach(e => {
    if (e.from === entry.id) linksOut.add(e.to);
  });

  // Backlinks: any entity whose body wikilinks to me, OR explicit edge to me
  const linksIn = new Set();
  entries.forEach(other => {
    if (other.id === entry.id || !other.body) return;
    if (other.body.toLowerCase().includes("[["+entry.title.toLowerCase()+"]]")) {
      linksIn.add(other.id);
    }
  });
  data.graph.edges.forEach(e => {
    if (e.to === entry.id) linksIn.add(e.from);
  });

  const inList = [...linksIn].map(id => entries.find(x => x.id === id)).filter(Boolean);
  const outList = [...linksOut].map(id => entries.find(x => x.id === id)).filter(Boolean);

  if (inList.length === 0 && outList.length === 0) return null;
  return (
    <section className="page__links">
      {inList.length > 0 && (
        <div className="page__links-col">
          <h3>Backlinks <span className="ct">{inList.length}</span></h3>
          {inList.slice(0, 12).map((n, i) => (
            <div key={i} className="page__links-row" onClick={()=>openEntry(n.id)}>
              <span className={"dot "+n.kind} />
              <span className="lbl">{n.title}</span>
              <span className="rel">{n.kind}</span>
            </div>
          ))}
        </div>
      )}
      {outList.length > 0 && (
        <div className="page__links-col">
          <h3>Outgoing <span className="ct">{outList.length}</span></h3>
          {outList.slice(0, 12).map((n, i) => (
            <div key={i} className="page__links-row" onClick={()=>openEntry(n.id)}>
              <span className={"dot "+n.kind} />
              <span className="lbl">{n.title}</span>
              <span className="rel">{n.kind}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PageView({ data, entry, entries, openEntry }) {
  let inner = null;
  if (entry.kind === "topic")   inner = <TopicPage   data={data} entry={entry} entries={entries} openEntry={openEntry} />;
  if (entry.kind === "article") inner = <ArticlePage data={data} entry={entry} entries={entries} openEntry={openEntry} />;
  if (entry.kind === "person")  inner = <PersonPage  data={data} entry={entry} entries={entries} openEntry={openEntry} />;
  if (entry.kind === "agent" || entry.kind === "org") inner = <SimpleEntityPage data={data} entry={entry} entries={entries} openEntry={openEntry} />;
  if (!inner) return null;
  return (
    <>
      {inner}
      <div className="page-links-wrap">
        <PageLinks data={data} entry={entry} entries={entries} openEntry={openEntry} />
      </div>
    </>
  );
}

function SimpleEntityPage({ data, entry, entries, openEntry }) {
  const outEdges = data.graph.edges.filter(e => e.from === entry.id);
  const created = outEdges
    .filter(e => /(created|authored|published)/.test(e.type))
    .map(e => entries.find(x => x.id === e.to))
    .filter(Boolean);
  // For agents, also surface articles whose body the agent wrote — i.e. notes
  // we marked author: "you+codex" etc.
  const isAgent = entry.kind === "agent";
  const isOrg = entry.kind === "org";
  const heading = isAgent ? `Notes created by ${entry.title}` :
                  isOrg ? `Published by ${entry.title}` :
                  `Linked to ${entry.title}`;
  const empty = isAgent
    ? `No notes created by ${entry.title} yet. The agent will fill this list as it processes new captures.`
    : isOrg
    ? `No articles published by ${entry.title} on file yet.`
    : "";

  return (
    <article className="page">
      <div className="page__kind"><span className={"dot "+entry.kind} />{entry.kind}</div>
      <h1 className="page__title">{entry.title}</h1>
      <div className="page__meta">
        {entry.weight!=null && <div>weight <b>{entry.weight.toFixed(2)}</b></div>}
        <div>{isAgent ? "notes" : "items"} <b>{created.length}</b></div>
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      <section className="page__section">
        <h3>{heading}</h3>
        {created.length > 0 ? (
          <div className="page__list">
            {created.map(c => (
              <div key={c.id} className="page__row" onClick={()=>openEntry(c.id)}>
                <div>
                  <div className="page__row-title">{c.title}</div>
                  <div className="page__row-sub">{c.kind}{c.sourceType ? " · "+c.sourceType : ""}{c.author ? " · "+c.author : ""}</div>
                </div>
                <div className="page__row-meta">{c.addedAt || ""}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{color:"var(--text-3)", fontFamily:"var(--sans)", fontSize:14}}>{empty}</p>
        )}
      </section>
    </article>
  );
}

function ArticlePage({ data, entry, entries, openEntry }) {
  // topics this article touches (via legacy claims that cited it, or graph edges)
  const claimsCiting = (data.claims||[]).filter(c => c.sourceIds && c.sourceIds.includes(entry.id));
  const topicIds = new Set();
  claimsCiting.forEach(c => c.topicIds.forEach(t => topicIds.add(t)));
  data.graph.edges.forEach(e => {
    if (e.from === entry.id) {
      const t = entries.find(x => x.id === e.to && x.kind === "topic");
      if (t) topicIds.add(t.id);
    }
  });
  const topics = [...topicIds].map(id => entries.find(e => e.id === id)).filter(Boolean);

  // Find the author as a person, if any
  const authorPerson = entries.find(p => p.kind === "person" && (
    p.title.toLowerCase() === (entry.author||"").toLowerCase() ||
    p.title.toLowerCase().replace(/^@/, "") === (entry.author||"").toLowerCase().replace(/^@/, "")
  )) || data.graph.edges
    .filter(e => e.to === entry.id && /(authored|published|produced_by)/.test(e.type))
    .map(e => entries.find(x => x.id === e.from))
    .find(x => x && x.kind === "person");

  const kindLabel = entry.isOwn ? "note" : (entry.sourceType || "article");

  return (
    <article className="page">
      <div className="page__kind">
        <span className="dot article" />
        article · {kindLabel}
      </div>
      <h1 className="page__title">{entry.title}</h1>
      {entry.url && (
        <p className="page__lede" style={{fontFamily:"var(--mono)", fontSize:13, color:"var(--text-3)"}}>
          <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.url}</a>
        </p>
      )}
      <div className="page__meta">
        {entry.author && (
          <div>by{" "}
            {authorPerson
              ? <b style={{cursor:"pointer", color:"var(--link)"}} onClick={()=>openEntry(authorPerson.id)}>{entry.author}</b>
              : <b>{entry.author}</b>}
          </div>
        )}
        {entry.addedAt && entry.addedAt !== "—" && <div>added <b>{entry.addedAt}</b></div>}
        {entry.trust && <div>trust <b>{entry.trust}</b></div>}
        {entry.tag && <div>tag <b>#{entry.tag}</b></div>}
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      {topics.length > 0 && (
        <section className="page__section">
          <h3>Topics</h3>
          <div className="page__list">
            {topics.map(t => (
              <div key={t.id} className="page__row" onClick={()=>openEntry(t.id)}>
                <div>
                  <div className="page__row-title">{t.title}</div>
                  <div className="page__row-sub">{t.summary}</div>
                </div>
                <div className="page__row-meta">topic</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function PersonPage({ data, entry, entries, openEntry }) {
  const outEdges = data.graph.edges.filter(e => e.from === entry.id);
  const articlesByEdge = outEdges
    .filter(e => /(authored|published|produced_by)/.test(e.type))
    .map(e => entries.find(x => x.id === e.to))
    .filter(x => x && x.kind === "article");
  const mentionsTopics = outEdges
    .filter(e => e.type === "mentions")
    .map(e => entries.find(x => x.id === e.to))
    .filter(x => x && x.kind === "topic");
  const articlesByAuthor = entries.filter(e =>
    e.kind === "article" && e.author && (
      e.author.toLowerCase() === entry.title.toLowerCase() ||
      ("@"+e.author.toLowerCase().replace(/^@/, "")) === entry.title.toLowerCase()
    )
  );
  const articleSet = new Map();
  [...articlesByEdge, ...articlesByAuthor].forEach(s => articleSet.set(s.id, s));
  const articles = [...articleSet.values()];

  return (
    <article className="page">
      <div className="page__kind"><span className="dot person" />person</div>
      <h1 className="page__title">{entry.title}</h1>
      <div className="page__meta">
        {entry.weight!=null && <div>weight <b>{entry.weight.toFixed(2)}</b></div>}
        <div>articles <b>{articles.length}</b></div>
        <div>topics <b>{mentionsTopics.length}</b></div>
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      {articles.length > 0 && (
        <section className="page__section">
          <h3>Articles by {entry.title}</h3>
          <div className="page__list">
            {articles.map(s => (
              <div key={s.id} className="page__row" onClick={()=>openEntry(s.id)}>
                <div>
                  <div className="page__row-title">{s.title}</div>
                  <div className="page__row-sub">{s.sourceType} · {s.addedAt}</div>
                </div>
                <div className="page__row-meta">{s.trust ? "trust·"+s.trust : ""}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {mentionsTopics.length > 0 && (
        <section className="page__section">
          <h3>Topics</h3>
          <div className="page__list">
            {mentionsTopics.map(t => (
              <div key={t.id} className="page__row" onClick={()=>openEntry(t.id)}>
                <div>
                  <div className="page__row-title">{t.title}</div>
                  <div className="page__row-sub">{t.summary}</div>
                </div>
                <div className="page__row-meta">topic</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function TopicPage({ data, entry, entries, openEntry }) {
  const incoming = data.graph.edges.filter(e => e.to === entry.id);
  const outgoing = data.graph.edges.filter(e => e.from === entry.id);
  // Articles that touch this topic — via legacy claims OR direct graph edges
  const articleIds = new Set();
  (data.claims||[]).forEach(c => {
    if (c.topicIds && c.topicIds.includes(entry.id)) c.sourceIds.forEach(s => articleIds.add(s));
  });
  incoming.forEach(e => {
    const fromEntry = entries.find(x => x.id === e.from);
    if (fromEntry && fromEntry.kind === "article") articleIds.add(fromEntry.id);
  });
  const articles = [...articleIds].map(id => entries.find(e => e.id === id)).filter(Boolean);

  return (
    <article className="page">
      <div className="page__kind"><span className="dot topic" />topic</div>
      <h1 className="page__title">{entry.title}</h1>
      <p className="page__lede">{entry.summary}</p>
      <div className="page__meta">
        <div>status <b>{entry.status}</b></div>
        <div>weight <b>{entry.weight.toFixed(2)}</b></div>
        <div>articles <b>{articles.length}</b></div>
        <div>links <b>{incoming.length + outgoing.length}</b></div>
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      {articles.length > 0 && (
        <section className="page__section">
          <h3>Articles</h3>
          <div className="page__list">
            {articles.map(a => (
              <div key={a.id} className="page__row" onClick={()=>openEntry(a.id)}>
                <div>
                  <div className="page__row-title">{a.title}</div>
                  <div className="page__row-sub">{a.sourceType} · {a.author}</div>
                </div>
                <div className="page__row-meta">{a.addedAt}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function SourcePage({ data, entry, entries, openEntry }) {
  const citingClaims = entries.filter(e => e.kind==="claim" && e.sourceIds && e.sourceIds.includes(entry.id));
  // topics this source contributes to (through its claims)
  const topicIds = new Set();
  citingClaims.forEach(c => c.topicIds.forEach(t => topicIds.add(t)));
  const topics = [...topicIds].map(id => entries.find(e => e.id === id)).filter(Boolean);

  // Match author string to a person entry (case-insensitive, with @ handling)
  const authorPerson = entries.find(p => p.kind === "person" && (
    p.title.toLowerCase() === (entry.author||"").toLowerCase() ||
    p.title.toLowerCase().replace(/^@/, "") === (entry.author||"").toLowerCase().replace(/^@/, "")
  ));
  // Or via graph edge (produced_by / authored / published from a person)
  const personFromEdge = !authorPerson && data.graph.edges
    .filter(e => e.to === entry.id && /(authored|published|produced_by)/.test(e.type))
    .map(e => entries.find(x => x.id === e.from))
    .find(x => x && x.kind === "person");
  const personLink = authorPerson || personFromEdge;

  return (
    <article className="page">
      <div className="page__kind"><span className="dot source" />source · {entry.sourceType}</div>
      <h1 className="page__title">{entry.title}</h1>
      {entry.url && (
        <p className="page__lede" style={{fontFamily:"var(--mono)", fontSize:13, color:"var(--text-3)"}}>
          <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.url}</a>
        </p>
      )}
      <div className="page__meta">
        <div>author{" "}
          {personLink
            ? <b style={{cursor:"pointer", color:"var(--link)"}} onClick={()=>openEntry(personLink.id)}>{entry.author}</b>
            : <b>{entry.author}</b>}
        </div>
        <div>added <b>{entry.addedAt}</b></div>
        <div>trust <b>{entry.trust}</b></div>
        <div>claims <b>{citingClaims.length}</b></div>
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      {citingClaims.length > 0 && (
        <section className="page__section">
          <h3>cited in</h3>
          <div className="page__list">
            {citingClaims.map(c => (
              <div key={c.id} className="page__row" onClick={()=>openEntry(c.id)}>
                <div>
                  <div className="page__row-title">{c.title}</div>
                  <div className="page__row-sub">{c.confidence} · {c.status}</div>
                </div>
                <div className="page__row-meta">claim</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="page__section">
          <h3>topics touched</h3>
          <div className="page__list">
            {topics.map(t => (
              <div key={t.id} className="page__row" onClick={()=>openEntry(t.id)}>
                <div>
                  <div className="page__row-title">{t.title}</div>
                  <div className="page__row-sub">{t.summary}</div>
                </div>
                <div className="page__row-meta">topic</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function ClaimPage({ data, entry, entries, openEntry }) {
  const sources = (entry.sourceIds||[]).map(id => entries.find(e => e.id === id)).filter(Boolean);
  const topics  = (entry.topicIds||[]).map(id => entries.find(e => e.id === id)).filter(Boolean);

  return (
    <article className="page">
      <div className="page__kind"><span className="dot claim" />claim</div>
      <h1 className="page__title">{entry.title}</h1>
      <div className="page__meta">
        <div>confidence <b>{entry.confidence}</b></div>
        <div>status <b>{entry.status}</b></div>
        <div>added <b>{entry.addedAt}</b></div>
      </div>

      {entry.body && (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      )}

      {sources.length > 0 && (
        <section className="page__section">
          <h3>cites</h3>
          <div className="page__list">
            {sources.map(s => (
              <div key={s.id} className="page__row" onClick={()=>openEntry(s.id)}>
                <div>
                  <div className="page__row-title">{s.title}</div>
                  <div className="page__row-sub">{s.sourceType} · {s.author}</div>
                </div>
                <div className="page__row-meta">trust·{s.trust}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="page__section">
          <h3>supports</h3>
          <div className="page__list">
            {topics.map(t => (
              <div key={t.id} className="page__row" onClick={()=>openEntry(t.id)}>
                <div>
                  <div className="page__row-title">{t.title}</div>
                  <div className="page__row-sub">{t.summary}</div>
                </div>
                <div className="page__row-meta">topic</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function NotePage({ data, entry, entries, openEntry }) {
  return (
    <article className="page">
      <div className="page__kind"><span className="dot note" />note</div>
      <h1 className="page__title">{entry.title}</h1>
      <div className="page__meta">
        <div>author <b>{entry.author}</b></div>
        <div>added <b>{entry.addedAt}</b></div>
        {entry.tag && <div>tag <b>#{entry.tag}</b></div>}
      </div>
      {entry.body ? (
        <section className="page__section page__section--prose">
          <Body body={entry.body} entries={entries} openEntry={openEntry} />
        </section>
      ) : (
        <section className="page__section">
          <p>This note was captured on {entry.addedAt}. It hasn't been expanded yet — open the canvas or graph to connect it to other ideas, or paste the full text here to flesh it out.</p>
        </section>
      )}
    </article>
  );
}

Object.assign(window, { PageView });
