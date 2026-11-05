import resources from "../../demo/resources.json";
import { TextLink } from "../../components/ui/index.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { directionLinks, unproject } from "./campusMap.js";
import { resourcesAt, whenAt } from "./placeInfo.js";
import { classWhen, classWhere } from "./classLayer.js";

/*
 * The side panel for one place. Each section gets the same `ctx` and returns null when it has nothing to show.
 * A new map layer (game day, parking, my sessions) adds one section component and one line in SECTIONS.
 * ctx: { place, title, xy, events, classes, range, places }
 */

function About({ place }) {
  const other = (place?.alt || []).filter(Boolean);
  return other.length ? <p className="t-small t-muted">Also called {other.join(", ")}</p> : null;
}

function YourClasses({ classes, range }) {
  if (!classes?.length) return null;
  return (
    <section className="map-section" aria-label="Your classes here">
      <h3 className="t-label t-faint">Your classes and sessions here</h3>
      <ul className="map-events">
        {classes.map((m) => (
          <li key={`${m.course}-${m.date}-${m.start}`}>
            <span className="t-label t-faint">{classWhen(m, range)}</span>
            <span className="t-heading">{classWhere(m)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingUp({ events, range }) {
  return (
    <section className="map-section" aria-label="Coming up here">
      <h3 className="t-label t-faint">Coming up {range === "today" ? "today" : "this week"}</h3>
      {events.length ? (
        <ul className="map-events">
          {events.map((e) => (
            <li key={e.id}>
              <span className="t-label t-faint">{whenAt(e.start, range)}</span>
              <span className="t-heading">{e.title}</span>
              <span className="t-small t-muted">{[e.where, e.host].filter(Boolean).join(" · ")}</span>
              {e.url ? <TextLink href={e.url} external>{e.source === "calendar" ? "UA's calendar" : "The SOURCE"}</TextLink> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-small t-muted">No events here {range === "today" ? "today" : "this week"}.</p>
      )}
    </section>
  );
}

function ResourcesHere({ place, places }) {
  const here = resourcesAt(place, resources, places);
  if (!here.length) return null;
  return (
    <section className="map-section" aria-label="Resources here">
      <h3 className="t-label t-faint">Help in this building</h3>
      <ul className="map-events">
        {here.map((r) => (
          <li key={r.id}>
            <TextLink href={routeHref("campus", ["r", r.id])} arrow>{r.name}</TextLink>
            <span className="t-small t-muted">{r.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Directions({ place, xy }) {
  const at = xy || place?.c;
  if (!at) return null;
  return (
    <section className="map-section ui-chips" aria-label="Directions">
      <span className="t-small t-muted">Directions:</span>
      {directionLinks(unproject(at), place?.name || "").map((l) => (
        <TextLink key={l.id} href={l.url} external>{l.label}</TextLink>
      ))}
    </section>
  );
}

const SECTIONS = [About, Directions, YourClasses, ComingUp, ResourcesHere];

export function PlacePanel(ctx) {
  return (
    <>
      <h2 className="t-title">{ctx.title}</h2>
      {SECTIONS.map((Section, i) => (
        <Section key={i} {...ctx} />
      ))}
    </>
  );
}
