import { useMemo, useState } from "react";
import resources from "../../demo/resources.json";
import { fuzzyFilter } from "../../lib/fuzzy.js";

export const CATEGORIES = [
  ["all", "All"],
  ["tutoring", "Tutoring"],
  ["academic", "Academic"],
  ["health", "Health"],
  ["money", "Money"],
  ["career", "Career"],
  ["rec", "Recreation"],
  ["tech", "Tech"],
  ["org_directory", "Clubs"],
];

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}/.test(String(s));
export const checkedText = (r) => (isDate(r.last_checked) ? `Last checked ${r.last_checked}` : "Not checked yet");

export function ResourcesScreen({ onOpenResource }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const inCategory = resources.filter((r) => category === "all" || r.category === category);
    const q = query.trim();
    return q ? fuzzyFilter(inCategory, q, (r) => `${r.name} ${r.description} ${r.tags.join(" ")}`) : inCategory;
  }, [category, query]);

  return (
    <div className="fd-screen">
      <h1 className="fd-title">Resources</h1>
      <p className="fd-lede">Every office and service in one place. Search with any words. You do not need the exact name.</p>
      <input className="fd-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: tutoring, books, sign in help..." aria-label="Search resources" />
      <div className="fd-chip-row" role="group" aria-label="Filter by category">
        {CATEGORIES.map(([id, label]) => (
          <button key={id} type="button" className={`fd-chip${category === id ? " is-on" : ""}`} aria-pressed={category === id} onClick={() => setCategory(id)}>
            {label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="fd-card-list">
          {shown.map((r) => (
            <li key={r.id} className="fd-card fd-card--click">
              <button type="button" className="fd-card-button" onClick={() => onOpenResource(r.id)}>
                <span className="fd-card-head">
                  <strong>{r.name}</strong>
                  <span className="fd-tag">{CATEGORIES.find(([id]) => id === r.category)?.[1] || r.category}</span>
                </span>
                <span className="fd-why">{r.description}</span>
                <span className="fd-meta">{checkedText(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="fd-empty">
          <p>No resources match "{query}".</p>
          <button type="button" className="fd-btn fd-btn--small" onClick={() => { setQuery(""); setCategory("all"); }}>
            Show everything
          </button>
        </div>
      )}
    </div>
  );
}
