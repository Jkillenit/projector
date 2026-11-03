import { APP_NAME } from "../constants/app.js";

function Icon({ children }) {
  return (
    <svg className="sh-rail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  today: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4z" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  ask: <path d="M5 5h14v10H10l-5 4z" />,
  decks: (
    <>
      <path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5V20" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 19.5c1.2-3.3 3.6-5 6.5-5s5.3 1.7 6.5 5" />
    </>
  ),
  grades: <path d="M4 20h16M7 17v-5M12 17V7M17 17v-8" />,
  yours: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

function RailItem({ icon, label, active, hint, ...rest }) {
  return (
    <button type="button" className={`sh-rail-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} {...rest}>
      <Icon>{ICONS[icon]}</Icon>
      <span className="sh-rail-label">{label}</span>
      {hint ? <span className="sh-rail-hint">{hint}</span> : null}
    </button>
  );
}

function splitCode(code) {
  const s = String(code || "").trim();
  const i = s.indexOf(" ");
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
}

function CourseButton({ c, active, onOpen }) {
  const [pre, num] = splitCode(c.code);
  return (
    <button
      type="button"
      className={`sh-rail-item sh-rail-course${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onOpen(c.id)}
      title={c.title ? `${c.title} (${c.hint})` : c.hint}
    >
      <span className="sh-rail-code-pre">{pre}</span>
      <span className="sh-rail-label sh-rail-code-num">{num}</span>
    </button>
  );
}

const ITEMS = [
  ["home", "today", "Home"],
  ["ask", "ask", "Ask"],
  ["resources", "decks", "Resources"],
  ["clubs", "person", "Clubs"],
  ["calendar", "calendar", "Calendar"],
];

/** Left rail: the six screens plus the student's courses. `view` is the current screen id. */
export function AppRail({ view, courseId, courses, orgs = [], onNavigate, onOpenCourse, onSearch }) {
  const kbd = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || "") ? "⌘ K" : "Ctrl K";
  const onScreen = (id) => courseId == null && view === id;

  return (
    <nav className="sh-rail sh-rail--pinned" aria-label="Main">
      <div className="sh-rail-panel">
        <div className="sh-rail-logo">
          <button type="button" className="sh-rail-brand" onClick={() => onNavigate("home")} title="Home">
            <span className="sh-rail-mark" aria-hidden>P</span>
            <span className="sh-rail-label sh-rail-wordmark">{APP_NAME}</span>
          </button>
        </div>

        <div className="sh-rail-group">
          <RailItem icon="search" label="Search" hint={kbd} onClick={onSearch} />
          {ITEMS.map(([id, icon, label]) => (
            <RailItem key={id} icon={icon} label={label} active={onScreen(id)} onClick={() => onNavigate(id)} />
          ))}
        </div>

        <div className="sh-rail-divider" />
        <div className="sh-rail-courses-head">
          <span className="sh-rail-label">Courses</span>
        </div>
        <div className="sh-rail-group sh-rail-course-list">
          {courses.map((c) => <CourseButton key={c.id} c={c} active={courseId === c.id} onOpen={onOpenCourse} />)}
          {orgs.length ? (
            <details className="sh-rail-orgs">
              <summary className="sh-rail-label">Organizations ({orgs.length})</summary>
              {orgs.map((c) => <CourseButton key={c.id} c={c} active={courseId === c.id} onOpen={onOpenCourse} />)}
            </details>
          ) : null}
        </div>

        <div className="sh-rail-spacer" />
        <div className="sh-rail-divider" />
        <div className="sh-rail-group">
          <RailItem icon="settings" label="Settings" active={onScreen("settings")} onClick={() => onNavigate("settings")} />
        </div>
      </div>
    </nav>
  );
}
