import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, Icon, TextLink } from "../../components/ui/index.jsx";
import { fuzzyFilter } from "../../lib/fuzzy.js";
import { routeHref } from "../../shell/useRoute.js";
import { useCampusEvents } from "../campus/useCampusEvents.js";
import campus from "./campus.json";
import { findBuilding, placeParts, project } from "./campusMap.js";
import { BUILDINGS, PLACES } from "./places.js";
import { PlacePanel } from "./PlacePanel.jsx";
import { MyClasses } from "./MyClasses.jsx";
import { classPins, classesInRange } from "./classLayer.js";
import { useMyClasses } from "./useMyClasses.js";
import { AddSession } from "./AddSession.jsx";
import { asMeeting, upcomingSessions } from "./mySessions.js";
import { useMySessions } from "./useMySessions.js";
import { localDayKey } from "../../lib/dates.js";

const QUAD = campus.areas.find((a) => a.name === "The Quad")?.c || [0, 0];
const START = { cx: QUAD[0], cy: QUAD[1], w: 1800 };
const MIN_W = 150;
const MAX_W = 7000;
const RANGES = [
  ["today", "Today"],
  ["week", "This week"],
];

/** Where an event goes on the map: the calendar's own coordinates, else the building its place names. */
function spotOf(e) {
  if (e.online) return null;
  if (e.geo) {
    const xy = project(e.geo.lat, e.geo.lon);
    return { key: findBuilding(e.where, PLACES)?.id || `geo-${xy.join(",")}`, xy, place: findBuilding(e.where, PLACES) };
  }
  const place = findBuilding(e.where, PLACES);
  return place ? { key: place.id, xy: place.c, place } : null;
}

/** Our own campus map: OpenStreetMap buildings, with today's (or this week's) events pinned where they happen. */
export function MapScreen({ query, placeId, addKind, addTitle }) {
  const [view, setView] = useState(START);
  const [range, setRange] = useState("today");
  const [picked, setPicked] = useState(null); // a pin key or a place id
  const [search, setSearch] = useState("");
  const svgRef = useRef(null);
  const drag = useRef(null);
  const { status, events } = useCampusEvents();

  // Pins: events in range, grouped by spot.
  const { pins, unpinned } = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const until = endOfToday.getTime() + (range === "today" ? 0 : 6 * 86400000);
    const inRange = events.filter((e) => Date.parse(e.start) <= until); // ended events are already gone
    const bySpot = new Map();
    let missing = 0;
    for (const e of inRange) {
      const s = spotOf(e);
      if (!s) {
        missing++;
        continue;
      }
      if (!bySpot.has(s.key)) bySpot.set(s.key, { ...s, events: [] });
      bySpot.get(s.key).events.push(e);
    }
    return { pins: [...bySpot.values()], unpinned: missing };
  }, [events, range]);

  // Your day: classes (myBama, or each course's syllabus meeting when myBama is not connected)
  // and sessions you added, as one layer of squares: today's, or the rest of this week's.
  const week = useMyClasses();
  const { sessions, add: addSession, remove: removeSession } = useMySessions();
  const [adding, setAdding] = useState(null); // null, or the form's prefill
  const classesNow = useMemo(() => {
    const today = localDayKey(new Date());
    const weekEnd = localDayKey(new Date(Date.now() + 6 * 86400000));
    const mine = upcomingSessions(sessions)
      .filter((s) => (range === "today" ? s.date === today : s.date <= weekEnd))
      .map(asMeeting);
    return [...classesInRange(week.meetings, range), ...mine].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }, [week.meetings, sessions, range]);
  const { pins: classSpots, unplaced } = useMemo(() => classPins(classesNow, PLACES), [classesNow]);

  // #/map?add=tutoring&title=Ingenuity Lab tutoring opens the form, from a tutoring resource's "Add it to my map".
  useEffect(() => {
    if (addKind || addTitle) setAdding({ kind: addKind, title: addTitle });
  }, [addKind, addTitle]);

  const focus = (place) => {
    if (!place) return;
    setPicked(place.id);
    setView((v) => ({ cx: place.c[0], cy: place.c[1], w: Math.min(v.w, 700) }));
  };

  // #/map?q=Bidgood Hall 116 opens on that building.
  useEffect(() => {
    if (!query) return;
    const found = findBuilding(query, PLACES);
    if (found) focus(found);
    else setSearch(placeParts(query)[0] || query); // show what we looked for, so the student can pick
  }, [query]);

  // #/map?place=w123 opens one place by its id.
  useEffect(() => {
    if (placeId) focus(PLACES.find((p) => p.id === placeId));
  }, [placeId]);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      setView((v) => ({ ...v, w: Math.min(MAX_W, Math.max(MIN_W, v.w * (e.deltaY > 0 ? 1.15 : 1 / 1.15))) }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const h = view.w * 0.75;
  const zoom = (f) => setView((v) => ({ ...v, w: Math.min(MAX_W, Math.max(MIN_W, v.w * f)) }));
  const onDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 4) return;
    if (!d.moved) {
      d.moved = true;
      // Capture only once it is a drag; capturing on press would send every click to the svg, not the building.
      svgRef.current?.setPointerCapture?.(e.pointerId);
    }
    const per = d.view.w / (svgRef.current?.clientWidth || 1);
    setView({ ...d.view, cx: d.view.cx - (e.clientX - d.x) * per, cy: d.view.cy - (e.clientY - d.y) * per });
  };
  const onUp = () => {
    setTimeout(() => (drag.current = null), 0); // let the click handler see whether this was a drag
  };
  const tap = (fn) => () => {
    if (!drag.current?.moved) fn();
  };

  const results = search.trim() ? fuzzyFilter(PLACES, search, (p) => [p.name, ...(p.alt || [])].join(" ")).slice(0, 6) : [];
  const pin = pins.find((p) => p.key === picked) || null;
  const classPin = classSpots.find((p) => p.key === picked) || null;
  const place = pin?.place || classPin?.place || PLACES.find((p) => p.id === picked) || null;
  const placeEvents = pin?.events || (place ? pins.find((p) => p.place?.id === place.id)?.events : null) || [];
  const placeClasses = (place && classSpots.find((p) => p.place.id === place.id)?.classes) || [];
  const r = view.w / 110; // pin radius that stays the same size on screen

  return (
    <div className="page map-page">
      <header className="page-head">
        <h1 className="t-display">Map</h1>
        <p className="page-sub">Your classes and campus events, where they happen.</p>
      </header>

      <div className="map-tools">
        <div className="campus-search map-search">
          <Icon name="search" size={16} />
          <label className="vh" htmlFor="map-q">Find a building</label>
          <input id="map-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a building, like Bidgood or Gorgas" autoComplete="off" />
        </div>
        <div className="ui-chips" role="group" aria-label="Which events to pin">
          {RANGES.map(([id, label]) => (
            <Chip key={id} filter pressed={range === id} onClick={() => setRange(id)}>{label}</Chip>
          ))}
        </div>
      </div>
      {results.length ? (
        <div className="ui-chips map-results">
          {results.map((p) => (
            <Chip key={p.id} onClick={() => { focus(p); setSearch(""); }}>{p.name}</Chip>
          ))}
        </div>
      ) : null}

      <div className="map-body">
        <div className="map-frame">
          <svg
            ref={svgRef}
            className="map-svg"
            viewBox={`${view.cx - view.w / 2} ${view.cy - h / 2} ${view.w} ${h}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Campus map"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {campus.areas.map((a) => (
              <path key={a.id} className={`map-area${picked === a.id ? " is-on" : ""}`} d={a.path} onClick={tap(() => setPicked(a.id))}>
                <title>{a.name}</title>
              </path>
            ))}
            <path className="map-road" d={campus.roads} style={{ strokeWidth: Math.max(4, view.w / 300) }} />
            <path className="map-context" d={campus.context} />
            {BUILDINGS.map((b) => (
              <path key={b.id} className={`map-bldg${picked === b.id || pin?.place?.id === b.id ? " is-on" : ""}`} d={b.path} onClick={tap(() => setPicked(b.id))}>
                <title>{b.name}</title>
              </path>
            ))}
            {classSpots.map((p) => (
              // Up and left of the building's center, so a class and an event in one building do not cover each other.
              <g
                key={p.key}
                className={`map-class-pin${p.classes.every((m) => m.session) ? " is-session" : ""}${picked === p.key ? " is-on" : ""}`}
                transform={`translate(${p.xy[0] - r * 1.3} ${p.xy[1] - r * 1.3})`}
                role="button"
                tabIndex={0}
                aria-label={`Your ${p.classes.length === 1 ? "class" : `${p.classes.length} classes`} in ${p.place.name}`}
                onClick={tap(() => setPicked(p.key))}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPicked(p.key)}
              >
                <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.45} />
                <text y={r * 0.35} fontSize={r * 1.05} textAnchor="middle">{p.classes.length}</text>
              </g>
            ))}
            {pins.map((p) => (
              <g
                key={p.key}
                className={`map-pin${picked === p.key ? " is-on" : ""}`}
                transform={`translate(${p.xy[0]} ${p.xy[1]})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.events.length} ${p.events.length === 1 ? "event" : "events"} at ${p.place?.name || p.events[0].where}`}
                onClick={tap(() => setPicked(p.key))}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPicked(p.key)}
              >
                <circle r={r} />
                <text y={r * 0.35} fontSize={r * 1.05} textAnchor="middle">{p.events.length}</text>
              </g>
            ))}
            {place ? (
              <text className="map-label" x={place.c[0]} y={place.c[1] - r * 1.8} fontSize={r * 1.2} textAnchor="middle">{place.name}</text>
            ) : null}
          </svg>
          <div className="map-zoom">
            <Button size="sm" aria-label="Zoom in" onClick={() => zoom(1 / 1.5)}>+</Button>
            <Button size="sm" aria-label="Zoom out" onClick={() => zoom(1.5)}>−</Button>
            <Button size="sm" onClick={() => { setView(START); setPicked(null); }}>Reset</Button>
          </div>
          <a className="map-credit" href={campus.creditUrl} target="_blank" rel="noopener noreferrer">{campus.credit}</a>
        </div>

        <Card className="map-side" aria-live="polite">
          {adding ? (
            <AddSession
              initial={adding}
              onCancel={() => setAdding(null)}
              onAdd={async (s) => {
                await addSession(s);
                setAdding(null);
                if (addKind || addTitle) window.location.hash = routeHref("map"); // or a reload opens the form again
                if (s.date !== localDayKey(new Date())) setRange("week");
              }}
            />
          ) : place || pin ? (
            <PlacePanel place={place} title={place?.name || pin.events[0].where} xy={pin?.xy} events={placeEvents} classes={placeClasses} range={range} places={PLACES} />
          ) : (
            <>
              <MyClasses week={week} spots={classSpots} unplaced={unplaced} range={range} onPick={(key) => setPicked(key)} onAdd={() => setAdding({})} onRemove={removeSession} />
              <h2 className="t-title">{status === "loading" ? "Getting events…" : `${pins.reduce((s, p) => s + p.events.length, 0)} events on the map`}</h2>
              <p className="t-small t-muted">Tap a pin or a building. Squares are your classes and sessions, circles are events. Drag to move, scroll or use + and − to zoom.</p>
              {unpinned ? (
                <p className="t-small t-faint">
                  {unpinned} more {unpinned === 1 ? "is" : "are"} online or at a place we could not find. <TextLink href={routeHref("events")} arrow>See all events</TextLink>
                </p>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
