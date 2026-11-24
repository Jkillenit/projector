import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Icon, Pill, Segmented, TextLink } from "../../components/ui/index.jsx";
import { TaskLine } from "../../components/TaskLine.jsx";
import { courseStore } from "../../db/courseStore.js";
import { loadJson, saveJson } from "../../lib/storage.js";
import { useCourseStyle } from "../../shell/CourseColors.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { getCourseLabel } from "./courseLabel.js";
import { eventsByDay, tagEvents } from "./calendarEvents.js";
import { eventTime } from "../campus/campusEvents.js";
import { useCampusEvents } from "../campus/useCampusEvents.js";
import { mapLink } from "../map/locations.js";
import { dayKey, groupByDay, monthGrid, rangeFor, shiftWeek, weekDays, weekStart } from "./calendarWeek.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MODE_KEY = "studyHub.v2.prefs.calendarMode";
const at = (key) => new Date(`${key}T12:00`);

function Dot({ id }) {
  return <span className="home-day-dot" style={useCourseStyle(id)} />;
}

function weekLabel(days) {
  const fmt = (d, withYear) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
  return `${fmt(days[0], days[0].getFullYear() !== days[6].getFullYear())} – ${fmt(days[6], true)}`;
}

/** One campus event in the day list (#215): the title opens its pin on the map; an interest match says why. */
function EventLine({ e }) {
  const link = mapLink({ where: e.where, online: e.online });
  return (
    <div className={`cal-event${e.match.length ? " is-match" : ""}`}>
      <span className="t-small t-faint">{eventTime(e.start)}</span>
      {link?.href ? <TextLink href={link.href} className="cal-event-title">{e.title}</TextLink> : <span className="cal-event-title">{e.title}</span>}
      <span className="t-small t-muted">{[e.where, e.host].filter(Boolean).join(" · ")}</span>
      {e.why ? (
        <span className="cal-event-why">
          <Pill tone="good" tiny>For you</Pill>
          <span className="t-small">{e.why}</span>
        </span>
      ) : null}
      {link?.note ? <span className="t-small t-faint">{link.note}</span> : null}
    </div>
  );
}

/**
 * Week or month grid in the This week cell style; picking a day lists its work as task rows, then campus events
 * (#215), with the ones that fit the student's interests marked. `day`: YYYY-MM-DD. `profile`: for interests.
 */
export function CalendarScreen({ day, profile }) {
  const start = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? at(day) : new Date();
  const [mode, setMode] = useState(() => (loadJson(MODE_KEY, "month") === "week" ? "week" : "month"));
  const [week, setWeek] = useState(() => weekStart(start));
  const [month, setMonth] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));
  const [selected, setSelected] = useState(() => dayKey(start));
  const [items, setItems] = useState([]);

  const days = useMemo(() => (mode === "week" ? weekDays(week) : monthGrid(month)), [mode, week, month]);
  const load = useCallback(async () => {
    const { from, to } = rangeFor(days);
    const res = await courseStore.getAssignmentsInRange({ from: from.toISOString(), to: to.toISOString() });
    setItems(Array.isArray(res) ? res : []);
  }, [days]);
  useEffect(() => {
    void load();
    window.addEventListener("studyhub-mirror-changed", load);
    window.addEventListener("studyhub-bb-synced", load);
    return () => {
      window.removeEventListener("studyhub-mirror-changed", load);
      window.removeEventListener("studyhub-bb-synced", load);
    };
  }, [load]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const { events } = useCampusEvents();
  const evByDay = useMemo(() => eventsByDay(tagEvents(events, profile?.interests)), [events, profile?.interests]);
  const pickMode = (next) => {
    setMode(next);
    saveJson(MODE_KEY, next);
    if (next === "week") setWeek(weekStart(at(selected)));
    else setMonth(new Date(at(selected).getFullYear(), at(selected).getMonth(), 1));
  };
  // Keep the selected day inside the visible range so the list matches the grid.
  const shift = (delta) => {
    if (mode === "week") {
      setWeek(shiftWeek(week, delta));
      setSelected(dayKey(shiftWeek(at(selected), delta)));
    } else {
      const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
      const now = new Date();
      setMonth(next);
      setSelected(dayKey(next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear() ? now : next));
    }
  };

  const todayKey = dayKey(new Date());
  const list = byDay.get(selected) || [];
  const dayEvents = evByDay.get(selected) || [];
  const unit = mode === "week" ? "week" : "month";

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Calendar</h1>
        <p className="page-sub">Everything due, from every class, and what is on around campus.</p>
      </header>
      <Card>
        <div className="cal-head">
          <div className="cal-nav">
            <button type="button" className="sb-icon-btn" onClick={() => shift(-1)} aria-label={`Previous ${unit}`}>
              <Icon name="chevron-right" size={16} className="flip" />
            </button>
            <span className="t-heading">{mode === "week" ? weekLabel(days) : month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <button type="button" className="sb-icon-btn" onClick={() => shift(1)} aria-label={`Next ${unit}`}>
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
          <div className="cal-mode">
            <Segmented label="Calendar view" options={[["week", "Week"], ["month", "Month"]]} value={mode} onChange={pickMode} />
          </div>
        </div>
        <div className="cal-grid">
          {WEEKDAYS.map((w) => <span key={w} className="cal-weekday">{w}</span>)}
          {days.map((d) => {
            const key = dayKey(d);
            const due = byDay.get(key) || [];
            const evs = evByDay.get(key) || [];
            const forYou = evs.filter((e) => e.match.length).length;
            const outside = mode === "month" && d.getMonth() !== month.getMonth();
            return (
              <button
                key={key}
                type="button"
                className={`home-day cal-day${key === todayKey ? " is-today" : ""}${key === selected ? " is-selected" : ""}${outside ? " is-outside" : ""}`}
                aria-pressed={key === selected}
                aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${due.length} due${evs.length ? `, ${evs.length} campus ${evs.length === 1 ? "event" : "events"}${forYou ? `, ${forYou} for you` : ""}` : ""}`}
                onClick={() => setSelected(key)}
              >
                <span className="home-day-num num">{d.getDate()}</span>
                <span className="home-day-dots" aria-hidden>
                  {due.slice(0, 4).map((a) => <Dot key={a.uuid} id={a.course_uuid} />)}
                  {due.length > 4 ? <span className="home-day-more">+{due.length - 4}</span> : null}
                </span>
                {evs.length ? (
                  <span className="cal-ev-dots" aria-hidden>
                    {evs.slice(0, 3).map((e) => <span key={e.id} className={`cal-ev-dot${e.match.length ? " is-match" : ""}`} />)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>
      <Card aria-labelledby="cal-day-h">
        <h2 id="cal-day-h" className="t-heading">{at(selected).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
        {list.length ? (
          <div className="rows-tight">
            {list.map((a) => (
              <TaskLine key={a.uuid} a={a} code={getCourseLabel({ courseCode: a.course_code, name: a.course_name })} href={routeHref("course", [a.course_uuid, "assignments"], { item: a.uuid })} />
            ))}
          </div>
        ) : (
          <p className="t-muted">Nothing due.</p>
        )}
        {dayEvents.length ? (
          <section className="cal-events" aria-labelledby="cal-ev-h">
            <h3 id="cal-ev-h" className="t-label t-faint">On campus</h3>
            {dayEvents.map((e) => <EventLine key={e.id} e={e} />)}
          </section>
        ) : null}
      </Card>
    </div>
  );
}
