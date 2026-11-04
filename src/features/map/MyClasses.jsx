import { TextLink } from "../../components/ui/index.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { classWhen, classWhere } from "./classLayer.js";

/** The map's default panel, top part: your classes in range, from myBama. Tap one to show its building. */
export function MyClasses({ week, spots, unplaced, range, onPick }) {
  if (week.status === "loading") return null;
  if (week.status === "notConnected") {
    return (
      <p className="t-small t-muted">
        See your classes on the map: <TextLink href={routeHref("settings")} arrow>connect myBama in Settings</TextLink>
      </p>
    );
  }
  if (week.status !== "ready") {
    return (
      <p className="t-small t-muted">
        {week.signedOut ? "myBama signed you out." : "Could not get your classes right now."} <TextLink href={routeHref("settings")} arrow>Sign in to myBama again</TextLink>
      </p>
    );
  }
  const rows = spots
    .flatMap((s) => s.classes.map((m) => ({ m, key: s.key })))
    .concat(unplaced.map((m) => ({ m, key: null })))
    .sort((a, b) => (a.m.date + a.m.start).localeCompare(b.m.date + b.m.start));
  return (
    <section className="map-section map-section--first" aria-label="Your classes">
      <h2 className="t-title">Your classes {range === "today" ? "today" : "this week"}</h2>
      {week.stale ? <p className="t-small t-faint">From your last myBama check.</p> : null}
      {rows.length ? (
        <ul className="map-events">
          {rows.map(({ m, key }) => (
            <li key={`${m.course}-${m.date}-${m.start}`}>
              <span className="t-label t-faint">{classWhen(m, range)}</span>
              {key ? (
                <button type="button" className="map-class-link t-heading" onClick={() => onPick(key)}>{classWhere(m)}</button>
              ) : (
                <span className="t-heading">{classWhere(m)}</span>
              )}
              {!key ? <span className="t-small t-faint">Not on the map yet: we could not find this building.</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-small t-muted">No classes {range === "today" ? "today" : "for the rest of this week"}.</p>
      )}
      {week.noMeetingTime.length ? (
        <p className="t-small t-muted">No set meeting time: {week.noMeetingTime.map((c) => `${c.course}${c.note ? ` (${c.note})` : ""}`).join(", ")}</p>
      ) : null}
    </section>
  );
}
