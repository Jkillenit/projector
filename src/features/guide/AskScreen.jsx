import { useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import { loadJson, saveJson } from "../../lib/storage.js";
import { toStudent } from "../../platform/profile.js";
import { ASK_COPY, EXAMPLE_QUESTIONS } from "./copy.js";
import { match, orgsAsResources } from "./matcher.js";

const HISTORY_KEY = "fd.askHistory";

function ResourceCard({ item, onOpenResource }) {
  const r = item.resource;
  const isClub = r.id.startsWith("org-");
  return (
    <li className="fd-card">
      <div className="fd-card-head">
        <strong>{r.name}</strong>
        <span className="fd-tag">{isClub ? "club" : r.category}</span>
      </div>
      <p className="fd-why">{item.why}</p>
      <p className="fd-meta">
        Source: {String(item.source_url).startsWith("http") ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.source_url}</a> : item.source_url}
        {" · "}Last checked: {item.last_checked}
      </p>
      {!isClub ? (
        <button type="button" className="fd-btn fd-btn--small" onClick={() => onOpenResource(r.id)}>
          {ASK_COPY.howToButton}
        </button>
      ) : null}
    </li>
  );
}

function Outcome({ result, onOpenResource, onNavigate }) {
  if (result.kind === "crisis") {
    return (
      <section className="fd-outcome fd-outcome--crisis" role="alert">
        <h2>{ASK_COPY.crisisTitle}</h2>
        <p>{result.message}</p>
        <ul className="fd-card-list">
          <li className="fd-card">
            <strong>{result.contacts[0].label}</strong>
            <p className="fd-big">{result.contacts[0].detail}</p>
          </li>
          <li className="fd-card">
            <strong>{result.contacts[1].label}</strong>
            <p className="fd-meta">Call or visit. Hours and phone: TODO verify.</p>
            <button type="button" className="fd-btn fd-btn--small" onClick={() => onOpenResource(result.contacts[1].resourceId)}>
              See the Counseling Center
            </button>
          </li>
        </ul>
      </section>
    );
  }
  if (result.kind === "sensitive") {
    return (
      <section className="fd-outcome fd-outcome--sensitive">
        <h2>{ASK_COPY.sensitiveTitle}</h2>
        <p>{result.message}</p>
        <p className="fd-meta">{ASK_COPY.sensitiveNote}</p>
        <ul className="fd-card-list">
          {result.items.map((item) => (
            <li key={item.resource.id} className="fd-card">
              <strong>{item.resource.name}</strong>
              <p className="fd-meta">Contact: {item.resource.contact} · Hours: {item.resource.hours}</p>
              <button type="button" className="fd-btn fd-btn--small" onClick={() => onOpenResource(item.resource.id)}>
                {ASK_COPY.howToButton}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (result.kind === "matched") {
    return (
      <section className="fd-outcome">
        <h2>{ASK_COPY.matchedTitle}</h2>
        <ul className="fd-card-list">
          {result.items.map((item) => (
            <ResourceCard key={item.resource.id} item={item} onOpenResource={onOpenResource} />
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section className="fd-outcome">
      <h2>{ASK_COPY.notSureTitle}</h2>
      <p>{result.message}</p>
      <button type="button" className="fd-btn" onClick={() => onNavigate("resources")}>
        {ASK_COPY.directoryButton}
      </button>
    </section>
  );
}

export function AskScreen({ profile, seed, onOpenResource, onNavigate }) {
  const [text, setText] = useState(seed || "");
  const [asked, setAsked] = useState(null);
  const [history, setHistory] = useState(() => loadJson(HISTORY_KEY, []));
  const pool = useMemo(() => [...resources, ...orgsAsResources(organizations)], []);
  const student = useMemo(() => toStudent(profile), [profile]);
  const ranSeed = useRef(null);

  const ask = (q) => {
    const question = q.trim();
    if (!question) return;
    setText(question);
    const result = match(question, student, pool);
    setAsked({ question, result });
    // Crisis and private topics are never written to history.
    if (!result.doNotStore) {
      const next = [question, ...history.filter((h) => h !== question)].slice(0, 5);
      setHistory(next);
      saveJson(HISTORY_KEY, next);
    }
  };

  useEffect(() => {
    if (seed && ranSeed.current !== seed) {
      ranSeed.current = seed;
      ask(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <div className="fd-screen">
      <div className="fd-banner" role="note">{ASK_COPY.banner}</div>
      <h1 className="fd-title">{ASK_COPY.title}</h1>
      <p className="fd-lede">{ASK_COPY.prompt}</p>
      <form
        className="fd-askbar-row"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input className="fd-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={ASK_COPY.placeholder} aria-label="Your question" />
        <button type="submit" className="fd-btn" disabled={!text.trim()}>
          {ASK_COPY.button}
        </button>
      </form>
      <div className="fd-chip-row">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" className="fd-chip" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
      <p className="fd-meta">{ASK_COPY.privacy}</p>

      {asked ? <Outcome result={asked.result} onOpenResource={onOpenResource} onNavigate={onNavigate} /> : null}

      <section className="fd-history">
        <h2>{ASK_COPY.historyTitle}</h2>
        {history.length ? (
          <ul className="fd-chip-row">
            {history.map((h) => (
              <li key={h}>
                <button type="button" className="fd-chip" onClick={() => ask(h)}>
                  {h}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fd-meta">{ASK_COPY.historyEmpty}</p>
        )}
      </section>
    </div>
  );
}
