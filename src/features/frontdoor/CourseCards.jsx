import { useCourseColor } from "../../shell/CourseColors.jsx";
import { Sparkline } from "../grades/Sparkline.jsx";
import { formatPct } from "../today/priority.js";
import { plainDue } from "../../lib/dates.js";

function Card({ card, onOpen }) {
  const color = useCourseColor(card.id).dot;
  const { next } = card;
  return (
    <li>
      <button type="button" className="fd-course-card" style={{ "--course": color }} onClick={() => onOpen(card.id)} title={card.hint}>
        <span className="fd-course-name">
          <strong>{card.code}</strong>
          {card.title ? <span className="fd-muted">{card.title}</span> : null}
        </span>
        <span className="fd-course-grade">
          <span className="fd-num fd-course-pct">{card.current == null ? "—" : `${formatPct(card.current)}%`}</span>
          {card.letter ? <span className="fd-course-letter">{card.letter}</span> : null}
          <Sparkline points={card.trend} />
        </span>
        {card.basis && card.basis !== "Syllabus weights" ? <span className="fd-meta">{card.basis}</span> : null}
        <span className="fd-course-foot">
          <span className="fd-meta">{next ? `Next: ${next.title}, ${next.due_date ? plainDue(next.due_date) : "no date"}` : "Nothing due"}</span>
          <span className={`fd-meta${card.missing ? " fd-warn" : ""}`}>{card.missing} missing</span>
        </span>
      </button>
    </li>
  );
}

/** One card per class. The whole card opens the course. */
export function CourseCards({ cards, onOpen }) {
  if (!cards.length) return null;
  return (
    <section aria-label="Your classes">
      <h2 className="fd-h2">Your classes</h2>
      <ul className="fd-course-grid">
        {cards.map((c) => (
          <Card key={c.id} card={c} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}
