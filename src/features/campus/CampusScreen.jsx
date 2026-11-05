import { useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import { SOURCE_DIRECTORY_URL } from "../clubs/sourceClubs.js";
import { useClubs } from "../clubs/useClubs.js";
import { Button, Card, Chip, Icon, Pill, StepList, TextLink } from "../../components/ui/index.jsx";
import { fuzzyFilter } from "../../lib/fuzzy.js";
import { toStudent } from "../../platform/profile.js";
import { routeHref } from "../../shell/useRoute.js";
import { meetingText, rankClubs } from "../clubs/clubMatch.js";
import { CATEGORIES, categoryLabel, checkedLabel, filterOf, searchText, signInNeeded, siteUrl, stepsOf } from "../resources/resourceView.js";

function SignInPill({ r }) {
  return signInNeeded(r) ? <Pill tone="warn">UA sign in</Pill> : <Pill tone="good">No sign in needed</Pill>;
}

function Detail({ r, onAsk, onClose }) {
  const url = siteUrl(r);
  return (
    <Card className="campus-detail" aria-labelledby="campus-detail-name">
      <button type="button" className="sb-icon-btn campus-close" aria-label="Close" onClick={onClose}>
        <Icon name="x" size={16} />
      </button>
      <span className="t-label t-faint">{categoryLabel(r)}</span>
      <h2 id="campus-detail-name" className="t-title">{r.name}</h2>
      <p className="t-muted">{r.description}</p>
      <SignInPill r={r} />
      <h3 className="campus-how">How to get in</h3>
      <StepList steps={stepsOf(r)} />
      {url ? (
        <Button variant="primary" size="lg" className="ui-btn--block" href={url} external>Go to the site</Button>
      ) : (
        <>
          <Button variant="primary" size="lg" className="ui-btn--block" disabled>Go to the site</Button>
          <span className="t-small t-faint">Site link: [not checked yet]</span>
        </>
      )}
      {r.category === "tutoring" ? (
        // Book on UA's own page, then put the session on the map (#34). Booking inside the app needs a tutoring connection.
        <div className="ui-chips">
          {url ? <Button href={url} external size="sm">Book a session</Button> : null}
          <Button href={routeHref("map", [], { add: "tutoring", title: r.name })} size="sm">Add it to my map</Button>
        </div>
      ) : null}
      <div className="card-foot">
        <span>Source: official UA page</span>
        <span>{checkedLabel(r)}</span>
        <TextLink className="card-foot-end" arrow onClick={() => onAsk(`How do I get into ${r.name}?`)}>Ask about this</TextLink>
      </div>
    </Card>
  );
}

const SHOW_CLUBS = 12; // The SOURCE lists 700+ clubs; show the best matches, link to the rest

function Clubs({ profile, sectionRef }) {
  const student = useMemo(() => toStudent(profile), [profile]);
  const { status, clubs, source, stale } = useClubs();
  const ranked = useMemo(() => rankClubs(clubs, student).slice(0, SHOW_CLUBS), [clubs, student]);
  const fromSource = source === "the-source";
  return (
    <section id="clubs" ref={sectionRef} className="campus-clubs" aria-labelledby="clubs-h">
      <div className="campus-clubs-head">
        <h2 id="clubs-h" className="t-title">Clubs that fit you</h2>
        <span className="t-small t-faint">{fromSource ? `Matched to your interests from The SOURCE${stale ? ". Showing the last list we got" : ""}` : "Matched to your interests and your free time"}</span>
        <TextLink href={routeHref("settings")} arrow className="card-foot-end">Edit interests</TextLink>
      </div>
      {status === "loading" ? <p className="t-small t-muted">Getting clubs…</p> : null}
      {status === "error" ? (
        <p className="t-small t-muted">
          Could not reach The SOURCE right now. Try again later, or <TextLink href={SOURCE_DIRECTORY_URL} external>browse clubs on The SOURCE</TextLink>.
        </p>
      ) : null}
      <div className="campus-club-grid">
        {ranked.map(({ club, shared, fits }) => {
          const when = club.meets ? ` Meets ${meetingText(club)}.` : "";
          return (
            <Card key={club.id} className="campus-club">
              <h3 className="t-heading">{club.name}</h3>
              <p className="t-small t-muted">{shared.length ? `Matches your interest in ${shared.join(" and ")}.${when}` : `${club.description}${when}`}</p>
              <div className="ui-chips">
                {/* TODO(data): compare with the class schedule once it is synced; free times stand in for now. */}
                {club.meets ? fits ? <Pill tone="good">Meets when you are free</Pill> : <Pill tone="warn">Outside your free time</Pill> : null}
                {club.interests[0] || club.categories?.[0] ? <Pill tone="neutral">{club.interests[0] || club.categories[0]}</Pill> : null}
              </div>
              {club.url ? (
                <TextLink href={club.url} external>See it on The SOURCE</TextLink>
              ) : (
                <TextLink href={routeHref("campus", ["r", "the-source"])} arrow>How to join</TextLink>
              )}
            </Card>
          );
        })}
      </div>
      {fromSource && clubs.length > SHOW_CLUBS ? (
        <TextLink href={SOURCE_DIRECTORY_URL} external>See all {clubs.length} clubs on The SOURCE</TextLink>
      ) : null}
    </section>
  );
}


/**
 * Every campus resource with fuzzy search and filters, a detail panel (a sheet on narrow screens),
 * then clubs. `section` "clubs" scrolls to clubs; `resourceId` opens one resource. Events have their own screen.
 */
export function CampusScreen({ profile, section, resourceId, actions }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState(resourceId || null);
  const [sheet, setSheet] = useState(!!resourceId);
  const clubsRef = useRef(null);

  useEffect(() => {
    if (resourceId) {
      setPicked(resourceId);
      setSheet(true);
    }
  }, [resourceId]);
  useEffect(() => {
    if (section === "clubs") clubsRef.current?.scrollIntoView({ block: "start" });
  }, [section]);

  const filters = useMemo(() => CATEGORIES.filter(([id]) => id === "all" || resources.some((r) => filterOf(r) === id)), []);
  const shown = useMemo(() => {
    const inFilter = resources.filter((r) => filter === "all" || filterOf(r) === filter);
    const q = query.trim();
    return q ? fuzzyFilter(inFilter, q, searchText) : inFilter;
  }, [filter, query]);
  const current = resources.find((r) => r.id === picked) || shown[0] || null;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Campus</h1>
        <p className="page-sub">Every place that can help, with the exact steps to get in.</p>
      </header>

      <div className="campus-search">
        <Icon name="search" size={16} />
        <label className="vh" htmlFor="campus-q">Search campus resources</label>
        <input id="campus-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={'Try "tutoring", "rent help" or "printing". Close words work too.'} autoComplete="off" />
      </div>
      <div className="ui-chips" role="group" aria-label="Filter by kind of help">
        {filters.map(([id, label]) => (
          <Chip key={id} filter pressed={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
        ))}
      </div>

      <div className="campus-body">
        <div className="campus-grid">
          {shown.length ? (
            shown.map((r) => (
              <button
                key={r.id}
                type="button"
                className="campus-card"
                aria-pressed={current?.id === r.id}
                onClick={() => {
                  setPicked(r.id);
                  setSheet(true);
                }}
              >
                <span className="t-label t-faint">{categoryLabel(r)}</span>
                <span className="t-heading">{r.name}</span>
                <span className="t-small t-muted">{r.description}</span>
                <SignInPill r={r} />
              </button>
            ))
          ) : (
            <div className="ui-empty">
              <span>Nothing matches "{query}".</span>
              <Button variant="quiet" size="sm" onClick={() => { setQuery(""); setFilter("all"); }}>Show everything</Button>
              <TextLink arrow onClick={() => actions.ask(query)}>Ask instead</TextLink>
            </div>
          )}
        </div>
        {current ? (
          <div className={`campus-side${sheet ? " is-open" : ""}`}>
            <div className="campus-scrim" onClick={() => setSheet(false)} aria-hidden />
            <Detail r={current} onAsk={(q) => actions.ask(q, { prefill: true })} onClose={() => setSheet(false)} />
          </div>
        ) : null}
      </div>

      <Clubs profile={profile} sectionRef={clubsRef} />
    </div>
  );
}
