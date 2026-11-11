import { Button, TextLink } from "../../components/ui/index.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { classWhen, classWhere } from "./classLayer.js";
import { KINDS } from "./mySessions.js";

const kindLabel = (k) => KINDS.find(([id]) => id === k)?.[1] || "Session";

/**
 * The map's default panel, top part: your day (or week). Classes from myBama and sessions you added, in time order.
 * Tap one to show its building. Sessions can be removed here.
 */
export function MyClasses({ week, spots, unplaced, range, onPick, onAdd, onRemove }) {
  const rows = spots
    .flatMap((s) => s.classes.map((m) => ({ m, key: s.key })))
    .concat(unplaced.map((m) => ({ m, key: null })))
    .sort((a, b) => (a.m.date + a.m.start).localeCompare(b.m.date + b.m.start));
  const when = range === "today" ? "today" : "this week";
  return (
    <section className="map-section map-section--first" aria-label="Your day">
      <h2 className="t-title">{range === "today" ? "Your day" : "Your week"}</h2>
      {week.status === "notConnected" ? (
        <p className="t-small t-muted">
          See your classes here: <TextLink href={routeHref("settings")} arrow>connect your UA account in Settings</TextLink>
        </p>
      ) : week.status === "signedOut" || week.status === "error" ? (
        <p className="t-small t-muted">
          {week.signedOut ? "myBama signed you out." : "Could not get your classes right now."} <TextLink href={routeHref("settings")} arrow>Sign in again</TextLink>
        </p>
      ) : null}
      {week.stale ? <p className="t-small t-faint">Classes from your last myBama check.</p> : null}
      {week.status === "syllabus" ? (
        <p className="t-small t-faint">
          From your syllabi. For your myBama schedule, <TextLink href={routeHref("settings")} arrow>connect your UA account</TextLink>
        </p>
      ) : null}
      {rows.length ? (
        <ul className="map-events">
          {rows.map(({ m, key }) => (
            <li key={m.id || `${m.course}-${m.date}-${m.start}`}>
              <span className="t-label t-faint">
                {classWhen(m, range)}
                {m.session ? ` · ${kindLabel(m.kind)}` : ""}
              </span>
              {key ? (
                <button type="button" className="map-class-link t-heading" onClick={() => onPick(key)}>{classWhere(m)}</button>
              ) : (
                <span className="t-heading">{classWhere(m)}</span>
              )}
              {!key && !/online/i.test(m.building) ? <span className="t-small t-faint">Not on the map yet: we could not find this building.</span> : null}
              {m.session ? (
                <Button size="sm" variant="quiet" onClick={() => onRemove(m.id)} aria-label={`Remove ${m.title}`}>Remove</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : week.status === "ready" || week.status === "syllabus" ? (
        <p className="t-small t-muted">Nothing on your schedule {when}.</p>
      ) : null}
      {week.noMeetingTime?.length ? (
        <p className="t-small t-muted">No set meeting time: {week.noMeetingTime.map((c) => `${c.course}${c.note ? ` (${c.note})` : ""}`).join(", ")}</p>
      ) : null}
      {week.status === "syllabus" && week.unknown?.length ? (
        <p className="t-small t-muted">We don't know where these meet yet: {week.unknown.join(", ")}. Add it on the course page.</p>
      ) : null}
      <div className="ui-chips">
        <Button size="sm" onClick={onAdd}>Add a session</Button>
      </div>
    </section>
  );
}
