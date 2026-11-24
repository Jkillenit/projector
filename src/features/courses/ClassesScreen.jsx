import { useMemo } from "react";
import resources from "../../demo/resources.json";
import { Button, Card, CourseDot, Loading, Pill, ProgressBar, TextLink, VisuallyHidden } from "../../components/ui/index.jsx";
import { useCourseStyle } from "../../shell/CourseColors.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { useHomeData } from "../frontdoor/useHomeData.js";
import { ShowOnMap } from "../map/ShowOnMap.jsx";
import { SessionCard } from "../resources/SessionCard.jsx";
import { tutoringFor } from "../resources/tutoring.js";
import { formatPct } from "../today/priority.js";
import { riskOf } from "./atRisk.js";
import { useOrgIds } from "./useOrgIds.js";

// When a class has no tutoring of its own: study help for any class.
const ANY_CLASS = resources.find((r) => r.id === "center-for-academic-success");

/** Help for a class at risk: its own tutoring sessions, or study help for any class. Never the grade. */
function ClassHelp({ c, reasons }) {
  const sessions = tutoringFor(c.code);
  return (
    <section className="class-help" aria-label={`Help for ${c.code}`}>
      <p className="t-small">{`${c.code}: ${reasons.join(" and ")}. Tutoring can help.`}</p>
      {sessions.length ? (
        sessions.map((s) => <SessionCard key={s.id} s={s} />)
      ) : ANY_CLASS ? (
        <div className="class-help-any">
          <span className="t-small t-muted">{`No tutoring just for ${c.code} yet.`}</span>
          <TextLink href={routeHref("campus", ["r", ANY_CLASS.id])}>{ANY_CLASS.name}</TextLink>
          <ShowOnMap locationId={ANY_CLASS.locationId} where={ANY_CLASS.location} />
        </div>
      ) : null}
    </section>
  );
}

function ClassCard({ c, fact, shown, now }) {
  const { atRisk, reasons } = riskOf(fact, { now });
  return (
    <Card className="class-card" style={useCourseStyle(c.id)} aria-labelledby={`class-${c.id}`}>
      <div className="class-head">
        <CourseDot />
        <a id={`class-${c.id}`} className="class-code" href={routeHref("course", [c.id])}>{c.code}</a>
        {c.title && c.title !== c.code ? <span className="t-small t-muted class-title">{c.title}</span> : null}
        {atRisk ? <Pill tone="warn" tiny>Needs a look</Pill> : <Pill tone="good" tiny>On track</Pill>}
        {c.current == null ? (
          <span className="t-faint t-small class-grade">No grades</span>
        ) : (
          <span className="home-grade-num num class-grade">
            <span className={shown ? undefined : "is-blurred"} aria-hidden={!shown}>{formatPct(c.current)}%{c.letter ? `  ${c.letter}` : ""}</span>
            {shown ? null : <VisuallyHidden>Grade hidden</VisuallyHidden>}
          </span>
        )}
      </div>
      <ProgressBar value={c.doneW} dim label={`${Math.round(c.doneW)}% of ${c.code} graded`} />
      <span className="home-grade-note">{`${Math.round(c.doneW)}% of the grade is in`}</span>
      {atRisk ? <ClassHelp c={c} reasons={reasons} /> : null}
      <TextLink href={routeHref("course", [c.id])}>{`Open ${c.code}`}</TextLink>
    </Card>
  );
}

/**
 * Every class on one page (#213). A class below its target, or with an exam within 10 days, gets that class's
 * tutoring and Show on map. Grades stay hidden until the student shows them, and the help never names the grade.
 */
export function ClassesScreen({ gradesShown, onGradesShown }) {
  const data = useHomeData(useOrgIds());
  const facts = useMemo(() => new Map((data.facts || []).map((f) => [f.id, f])), [data.facts]);
  const now = data.now || new Date();
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Classes</h1>
        <p className="page-sub">Your classes, and help for the ones that need it.</p>
        <div>
          <Button variant="outline-sm" size="sm" icon="eye" aria-pressed={gradesShown} onClick={() => onGradesShown(!gradesShown)}>
            {gradesShown ? "Hide grades" : "Show grades"}
          </Button>
        </div>
      </header>
      {!data.loaded ? (
        <Loading>Loading your classes…</Loading>
      ) : data.courses.length ? (
        <div className="classes-list">
          {data.courses.map((c) => <ClassCard key={c.id} c={c} fact={facts.get(c.id)} shown={gradesShown} now={now} />)}
        </div>
      ) : (
        <p className="t-small t-muted">No classes yet. They show up after your first sync.</p>
      )}
    </div>
  );
}
