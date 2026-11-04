import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Icon, Segmented } from "../../components/ui/index.jsx";
import { TaskLine } from "../../components/TaskLine.jsx";
import { courseStore } from "../../db/courseStore.js";
import { loadJson, saveJson } from "../../lib/storage.js";
import { useCourseStyle } from "../../shell/CourseColors.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { getCourseLabel } from "./courseLabel.js";
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

/** Week or month grid in the This week cell style; picking a day lists its work as task rows. `day`: YYYY-MM-DD. */
export function CalendarScreen({ day }) {
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
  const unit = mode === "week" ? "week" : "month";

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Calendar</h1>
        <p className="page-sub">Everything due, from every class.</p>
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
            const outside = mode === "month" && d.getMonth() !== month.getMonth();
            return (
              <button
                key={key}
                type="button"
                className={`home-day cal-day${key === todayKey ? " is-today" : ""}${key === selected ? " is-selected" : ""}${outside ? " is-outside" : ""}`}
                aria-pressed={key === selected}
                aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${due.length} due`}
                onClick={() => setSelected(key)}
              >
                <span className="home-day-num num">{d.getDate()}</span>
                <span className="home-day-dots" aria-hidden>
                  {due.slice(0, 4).map((a) => <Dot key={a.uuid} id={a.course_uuid} />)}
                  {due.length > 4 ? <span className="home-day-more">+{due.length - 4}</span> : null}
                </span>
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
      </Card>
    </div>
  );
}
