/* global React */
/* Loka — Home (Obsidian-like simple) */

function HomeView({ data, entries, openEntry }) {
  const hour = new Date().getHours();
  const greet = hour < 11 ? "good morning" : hour < 17 ? "good afternoon" : "good evening";

  // Recent additions across all kinds, sorted by addedAt desc
  const recent = entries
    .filter(e => e.addedAt && e.addedAt !== "—")
    .sort((a,b) => (b.addedAt||"").localeCompare(a.addedAt||""))
    .slice(0, 8);

  const topics = entries.filter(e=>e.kind==="topic")
    .sort((a,b)=>(b.weight||0)-(a.weight||0))
    .slice(0, 6);

  return (
    <div className="home">
      <div className="home__eyebrow">{new Date().toLocaleDateString(undefined,{ weekday: "long", day: "numeric", month: "long" })}</div>
      <div className="home__hero">
        <h1>{greet}, Sahrul.</h1>
        <p className="home__lede">
          {entries.length} entries in your vault — across {entries.filter(e=>e.kind==="topic").length} topics,
          {' '}{entries.filter(e=>e.kind==="source").length} sources, and a handful of claims and notes.
        </p>
      </div>

      <div className="home__block">
        <h3>recent <span className="sub">across all kinds</span></h3>
        <div className="home__items">
          {recent.map(e => (
            <div key={e.id} className="home__item" onClick={()=>openEntry(e.id)}>
              <span className={"dot "+e.kind} />
              <span className="title">{e.title}</span>
              <span className="meta">{e.addedAt}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="home__block">
        <h3>active topics <span className="sub">by weight</span></h3>
        <div className="home__items">
          {topics.map(t => (
            <div key={t.id} className="home__item" onClick={()=>openEntry(t.id)}>
              <span className="dot topic" />
              <span className="title">{t.title}</span>
              <span className="meta">{(t.weight||0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeView });
