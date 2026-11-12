import { useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import { Button, Card, Chip, CodeTag, CourseDot, Icon, Notice, Pill, ProgressBar, Skeleton, TextLink, VisuallyHidden } from "../../components/ui/index.jsx";
import { courseStore } from "../../db/courseStore.js";
import { useColorLookup, useCourseStyle } from "../../shell/CourseColors.jsx";
import { courseStyle } from "../dashboard/courseColor.js";
import { routeHref } from "../../shell/useRoute.js";
import { useOrgIds } from "../courses/useOrgIds.js";
import { formatPct } from "../today/priority.js";
import { openInBlackboard } from "../mirror/openInBlackboard.js";
import { coursePicks } from "./coursePicks.js";
import { greeting } from "./dueSoon.js";

import { useCampusEvents } from "../campus/useCampusEvents.js";
import { tomorrowWalks } from "../map/classLayer.js";
import { useIndoor } from "../map/useIndoor.js";
import { useMyClasses } from "../map/useMyClasses.js";
import { askSuggestions, dueText, eventWhen, homeEvents, kindLabel, postedText, subtitleText, timeLeft } from "./homeView.js";
import { lastVisitOrDefault } from "./newGrades.js";
import { useHomeData } from "./useHomeData.js";

const VISIT_KEY = "fd.lastVisit";
const TONIGHT_ROWS = 5;
const GENERAL = ["center-for-academic-success", "academic-advising"];

function TaskMeta({ t, now }) {
  const due = dueText(t.dueDate, now);
  return (
    <span className="ui-meta">
      <CodeTag>{t.code}</CodeTag>
      <span>{kindLabel(t.kind, t.title)}</span>
      {Date.parse(t.dueDate) < now.getTime() ? <Pill tone="accent" inline>Missing</Pill> : due.today ? <Pill tone="accent" inline>{due.text}</Pill> : <span>{due.text}</span>}
    </span>
  );
}

function FeaturedTask({ t, now }) {
  return (
    <div className="home-featured" style={useCourseStyle(t.courseUuid)}>
      <CourseDot size={10} />
      <div className="ui-row-main">
        <span className="ui-row-title home-featured-title">{t.title}</span>
        <TaskMeta t={t} now={now} />
      </div>
      <Button variant="primary" external onClick={() => openInBlackboard(t.url)}>Open in Blackboard</Button>
    </div>
  );
}

function TaskRow({ t, now }) {
  return (
    <a className="ui-row home-task" href={routeHref("course", [t.courseUuid, "assignments"], { item: t.uuid })} style={useCourseStyle(t.courseUuid)}>
      <CourseDot size={10} />
      <span className="ui-row-main">
        <span className="ui-row-title">{t.title}</span>
        <TaskMeta t={t} now={now} />
      </span>
      <span className="ui-left">{timeLeft(t.dueDate, now)}</span>
      <Icon name="chevron-right" size={16} className="ui-chev" />
    </a>
  );
}

function Tonight({ tasks, now }) {
  const [first, ...rest] = tasks;
  return (
    <Card className="home-card home-tile--tonight" aria-labelledby="tonight-h">
      <div className="home-tonight-head">
        <h2 id="tonight-h" className="t-title">Tonight</h2>
        <span className="t-small t-faint">{tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}</span>
        <span className="home-sort">Sorted by due date, weight and grade risk</span>
      </div>
      {first ? (
        <div>
          <FeaturedTask t={first} now={now} />
          {rest.slice(0, TONIGHT_ROWS - 1).map((t) => <TaskRow key={t.uuid} t={t} now={now} />)}
          {tasks.length > TONIGHT_ROWS ? <div className="home-more"><TextLink href={routeHref("calendar")} arrow>See all</TextLink></div> : null}
        </div>
      ) : (
        <div className="ui-empty">
          <span>Nothing due tonight.</span>
          <TextLink href={routeHref("calendar")} arrow>Open calendar</TextLink>
        </div>
      )}
    </Card>
  );
}

function DayDot({ id }) {
  return <span className="home-day-dot" style={useCourseStyle(id)} />;
}

function ThisWeek({ week }) {
  return (
    <Card className="home-tile--week" aria-labelledby="week-h">
      <div className="card-head">
        <h2 id="week-h" className="t-heading">This week</h2>
        <TextLink href={routeHref("calendar")} arrow>Open calendar</TextLink>
      </div>
      <div className="home-week">
        {week.map((d) => (
          <a key={d.key} className={`home-day${d.isToday ? " is-today" : ""}`} href={routeHref("calendar", [], { day: d.key })} aria-label={`${d.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${d.items.length} due`}>
            <span className="home-day-name">{d.name}</span>
            <span className="home-day-num num">{d.date.getDate()}</span>
            <span className="home-day-dots" aria-hidden>
              {d.items.slice(0, 4).map((r) => <DayDot key={r.uuid} id={r.course_uuid} />)}
              {d.items.length > 4 ? <span className="home-day-more">+{d.items.length - 4}</span> : null}
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}

function AskBar({ suggestions, onAsk }) {
  const [text, setText] = useState("");
  return (
    <div className="home-askbar">
      <form className="home-ask" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onAsk(text.trim()); }}>
        <label className="vh" htmlFor="home-ask-input">Ask about anything on campus</label>
        <Icon name="ask" size={20} className="home-ask-icon" />
        <input id="home-ask-input" className="ui-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tutoring, clubs, money, where to get help…" />
        <Button type="submit" size="lg">Ask</Button>
      </form>
      <div className="ui-chips">
        {suggestions.slice(0, 3).map((s) => <Chip key={s} onClick={() => onAsk(s)}>{s}</Chip>)}
      </div>
    </div>
  );
}

function GradeRow({ c, shown, fresh }) {
  const note = fresh ? postedText(fresh.name, fresh.at) : `${Math.round(c.doneW)}% of the grade is in`;
  return (
    <a className="home-grade ui-row" href={routeHref("course", [c.id, "grades"])} style={useCourseStyle(c.id)}>
      <span className="home-grade-top">
        <CourseDot />
        <span className="home-grade-code">{c.code}</span>
        {fresh ? <Pill tone="new" tiny>New grade</Pill> : null}
        {c.current == null ? (
          <span className="t-faint t-small">No grades</span>
        ) : (
          <span className="home-grade-num num">
            <span className={shown ? undefined : "is-blurred"} aria-hidden={!shown}>{formatPct(c.current)}%{c.letter ? `  ${c.letter}` : ""}</span>
            {shown ? null : <VisuallyHidden>Grade hidden</VisuallyHidden>}
          </span>
        )}
      </span>
      <ProgressBar value={c.doneW} dim label={`${Math.round(c.doneW)}% of ${c.code} graded`} />
      <span className="home-grade-note">{note}</span>
    </a>
  );
}

function ClassesCard({ courses, shown, onShown, freshFor }) {
  return (
    <Card className="home-tile--classes" aria-labelledby="classes-h">
      <div className="card-head">
        <h2 id="classes-h" className="t-heading">How classes are going</h2>
        <Button variant="outline-sm" size="sm" icon="eye" aria-pressed={shown} onClick={() => onShown(!shown)}>
          {shown ? "Hide grades" : "Show grades"}
        </Button>
      </div>
      {courses.length ? (
        <div className="home-grades">
          {courses.map((c) => <GradeRow key={c.id} c={c} shown={shown} fresh={freshFor(c)} />)}
        </div>
      ) : (
        <p className="t-small t-muted">No classes yet. They show up after your first sync.</p>
      )}
    </Card>
  );
}

function HelpItem({ p, style }) {
  return (
    <li className="home-help-item">
      <span className="home-help-for" style={style}>
        {p.courseId ? <CourseDot size={6} /> : null}
        {p.code ? `For ${p.code} · ${p.why}` : "Good places to start"}
      </span>
      <span className="home-help-name">{p.resource.name}</span>
      <span className="t-small t-muted">{p.resource.description}</span>
      <TextLink href={routeHref("campus", ["r", p.resource.id])} arrow>How to get in</TextLink>
    </li>
  );
}

function HelpCard({ facts }) {
  const colorOf = useColorLookup();
  const picks = useMemo(() => {
    // Only picks tied to a real task; one card per resource.
    const seen = new Set();
    const found = coursePicks(facts, resources).filter((p) => !p.key.startsWith("gap:") && !seen.has(p.resource.id) && seen.add(p.resource.id));
    return found.length ? found : GENERAL.map((id) => ({ key: id, resource: resources.find((r) => r.id === id) })).filter((p) => p.resource);
  }, [facts]);
  return (
    <Card className="home-tile--help" aria-labelledby="help-h">
      <h2 id="help-h" className="t-heading">Help for this week</h2>
      <ul className="home-help">
        {picks.map((p) => <HelpItem key={p.key} p={p} style={p.courseId ? courseStyle(colorOf(p.courseId)) : undefined} />)}
      </ul>
    </Card>
  );
}

function EventsCard({ interests }) {
  const { status, events } = useCampusEvents();
  const picks = useMemo(() => homeEvents(events, interests), [events, interests]);
  return (
    <Card className="home-tile--events" aria-labelledby="events-h">
      <div className="card-head">
        <h2 id="events-h" className="t-heading">On campus this week</h2>
        <TextLink href={routeHref("events")} arrow>All events</TextLink>
      </div>
      {status === "loading" ? (
        <div className="home-events"><Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} /></div>
      ) : picks.length ? (
        <ul className="home-events">
          {picks.map((e) => (
            <li key={e.id} className="home-event">
              <span className="home-event-when">{eventWhen(e.start)}</span>
              <span className="home-event-title">{e.title}</span>
              {e.where ? <span className="t-small t-muted">{e.where}</span> : null}
              {e.match.length ? <Pill tone="good" tiny>For you</Pill> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-small t-muted">Nothing on the list right now.</p>
      )}
    </Card>
  );
}

/** "Tomorrow: MATH 125 in Demo Hall 216." with a link to the walk (#72). Nothing when there is nothing to preview. */
function TomorrowWalk() {
  const { meetings } = useMyClasses();
  const { buildings } = useIndoor();
  const walks = useMemo(() => tomorrowWalks(meetings, buildings), [meetings, buildings]);
  if (!walks.length) return null;
  return (
    <Card aria-labelledby="walk-h">
      <h2 id="walk-h" className="t-heading">Tomorrow</h2>
      <ul className="home-help">
        {walks.map(({ m, walk }) => (
          <li key={`${walk.building}-${walk.room}`} className="home-help-item">
            <span>{m.course} in {m.building} {m.room}.</span>
            <TextLink href={routeHref("map", [], { walk: walk.building, room: walk.room })} arrow>Preview the walk</TextLink>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div className="home-bento" aria-busy="true">
      <Card className="home-tile--tonight"><Skeleton height={28} width="30%" radius={8} /><Skeleton height={88} /><Skeleton height={56} /><Skeleton height={56} /></Card>
      <Card className="home-tile--classes"><Skeleton height={22} width="50%" radius={8} /><Skeleton height={64} /><Skeleton height={64} /></Card>
      <Card className="home-tile--week"><Skeleton height={22} width="25%" radius={8} /><Skeleton height={84} /></Card>
      <Card className="home-tile--help"><Skeleton height={22} width="50%" radius={8} /><Skeleton height={64} /></Card>
      <Card className="home-tile--events"><Skeleton height={22} width="30%" radius={8} /><Skeleton height={72} /></Card>
    </div>
  );
}

export function FrontDoorScreen({ profile, mode, expired, onSignIn, gradesShown, onGradesShown, actions }) {
  const orgIds = useOrgIds();
  const data = useHomeData(orgIds);
  const [lastVisit, setLastVisit] = useState(null);

  // The marker moves forward once there is data to look at (the first sync in live mode), so the
  // first visit shows the last 14 days. This visit keeps comparing with the old marker.
  const visitRead = useRef(false);
  useEffect(() => {
    if (visitRead.current || (mode !== "demo" && !data.syncedAt)) return;
    visitRead.current = true;
    void courseStore.getSetting(VISIT_KEY).then((saved) => {
      setLastVisit(lastVisitOrDefault(saved));
      void courseStore.setSetting(VISIT_KEY, new Date().toISOString());
    });
  }, [mode, data.syncedAt]);

  const freshFor = (c) => {
    if (!lastVisit) return null;
    const since = Date.parse(lastVisit);
    return c.graded.filter((g) => Date.parse(g.at) > since).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] || null;
  };
  const newCount = data.loaded ? data.courses.filter(freshFor).length : 0;
  const now = data.now || new Date();
  const suggestions = useMemo(() => askSuggestions(data.tasks || [], profile.interests), [data.tasks, profile.interests]);
  const first = (profile.name || "").trim().split(/\s+/)[0];

  return (
    <div className="page">
      <header className="page-head home-head">
        <h1 className="t-display">{first ? `${greeting()}, ${first}` : greeting()}</h1>
        {data.loaded ? <p className="page-sub">{subtitleText(new Date(), data.dueCount, newCount)}</p> : null}
        <AskBar suggestions={suggestions} onAsk={actions.ask} />
      </header>

      {expired ? (
        <Notice action="Sign in again" onAction={onSignIn}>Your Blackboard sign in ran out. Due dates and grades may be a little old.</Notice>
      ) : null}

      <TomorrowWalk />

      {!data.loaded ? (
        <HomeSkeleton />
      ) : (
        <div className="home-bento">
          <Tonight tasks={data.tasks} now={now} />
          <ClassesCard courses={data.courses} shown={gradesShown} onShown={onGradesShown} freshFor={freshFor} />
          <ThisWeek week={data.week} />
          <HelpCard facts={data.facts} />
          <EventsCard interests={profile.interests} />
        </div>
      )}
    </div>
  );
}
