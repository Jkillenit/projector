import { useMemo, useState } from "react";
import { Card, Chip, Pill, TextLink } from "../../components/ui/index.jsx";
import { toStudent } from "../../platform/profile.js";
import { routeHref } from "../../shell/useRoute.js";
import { interestsOf } from "../clubs/sourceClubs.js";
import { CALENDAR_URL, eventTime, groupByDay } from "./campusEvents.js";
import { useCampusEvents } from "./useCampusEvents.js";

const FILTERS = [
  ["all", "All"],
  ["mine", "Your interests"],
  ["online", "Online"],
];

/** The next two weeks of campus events, by day, from The SOURCE and UA's calendar (demo events in Demo mode). */
export function EventsScreen({ profile }) {
  const mine = useMemo(() => toStudent(profile)?.interests || [], [profile]);
  const { status, events, stale, down } = useCampusEvents();
  const [filter, setFilter] = useState("all");

  const tagged = useMemo(() => events.map((e) => ({ ...e, match: interestsOf(e.text).filter((i) => mine.includes(i)) })), [events, mine]);
  const shown = useMemo(() => tagged.filter((e) => filter === "all" || (filter === "mine" ? e.match.length : e.online)), [tagged, filter]);
  const groups = useMemo(() => groupByDay(shown), [shown]);

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Events</h1>
        <p className="page-sub">The next two weeks on campus, from The SOURCE and UA's calendar{stale ? ". Showing the last list we got" : ""}.</p>
      </header>

      <div className="campus-clubs-head">
        <div className="ui-chips" role="group" aria-label="Filter events">
          {FILTERS.map(([id, label]) => (
            <Chip key={id} filter pressed={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
          ))}
        </div>
        <TextLink href={CALENDAR_URL} external className="card-foot-end">Full UA calendar</TextLink>
      </div>

      {status === "loading" ? <p className="t-small t-muted">Getting events…</p> : null}
      {status === "error" ? <p className="t-small t-muted">Could not get events right now. Try again later.</p> : null}
      {status === "ready" && down.length ? <p className="t-small t-faint">{down.join(" and ")} did not answer, so some events may be missing.</p> : null}
      {status === "ready" && !shown.length ? (
        <p className="t-small t-muted">
          {filter === "mine" ? (
            <>Nothing matches your interests in the next two weeks. <TextLink href={routeHref("settings")} arrow>Edit interests</TextLink></>
          ) : (
            "No events in the next two weeks."
          )}
        </p>
      ) : null}

      {groups.map((g) => (
        <section key={g.label} className="campus-clubs" aria-label={g.label}>
          <h2 className="t-title">{g.label}</h2>
          <div className="campus-club-grid">
            {g.events.map((e) => (
              <Card key={e.id} className="campus-club">
                <span className="t-label t-faint">{eventTime(e.start)}</span>
                <h3 className="t-heading">{e.title}</h3>
                <p className="t-small t-muted">{[e.where, e.host].filter(Boolean).join(" · ")}</p>
                <div className="ui-chips">
                  {e.online ? <Pill tone="neutral">Online</Pill> : null}
                  {e.match.length ? <Pill tone="good">Matches your interest in {e.match.join(" and ")}</Pill> : null}
                </div>
                {e.url ? <TextLink href={e.url} external>{e.source === "calendar" ? "See it on UA's calendar" : "See it on The SOURCE"}</TextLink> : null}
                {!e.online && e.where ? <TextLink href={routeHref("map", [], { q: e.where })} arrow>On the map</TextLink> : null}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
