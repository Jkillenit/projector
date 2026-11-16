import { useEffect, useState } from "react";
import { APP_NAME } from "../constants/app.js";
import { CourseDot, Icon } from "../components/ui/index.jsx";
import { Brand } from "./Brand.jsx";
import { syncedAgo } from "../features/today/syncedAgo.js";
import { useCourseStyle } from "./CourseColors.jsx";
import { railCode } from "./railCode.js";
import { routeHref } from "./useRoute.js";

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || "");
const searchKeys = () => (isMac() ? "⌘ K" : "Ctrl K");

function NavItem({ href, icon, active, children }) {
  return (
    <a className="sb-item" href={href} aria-current={active ? "page" : undefined} data-tip={children}>
      <Icon name={icon} size={18} />
      <span className="sb-label">{children}</span>
    </a>
  );
}

function CourseItem({ c, active, rail }) {
  const due = c.count ? `${c.count} due this week` : "";
  return (
    <a
      className="sb-item sb-course"
      href={routeHref("course", [c.id, "overview"])}
      aria-current={active ? "page" : undefined}
      title={rail ? undefined : c.hint}
      data-tip={c.label}
      data-tip-sub={due || undefined}
      style={useCourseStyle(c.id)}
    >
      {rail ? <span className="sb-tile" aria-hidden>{railCode(c.label)}</span> : <CourseDot />}
      <span className="sb-label">{c.label}</span>
      {c.count ? <span className="sb-count num" aria-label={due}>{c.count}</span> : null}
    </a>
  );
}

/** Re-render every minute so "Synced 13 min ago" stays true. */
function useMinute() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
}

/** Live / Demo status, last sync and the Settings button. */
export function SyncBox({ mode, studentName, sync, expired, onSettings }) {
  useMinute();
  const state = mode !== "live" ? "demo" : expired ? "expired" : sync?.running ? "syncing" : "live";
  const top = mode === "live" ? "Live" : `Demo${studentName ? ` · ${studentName}` : ""}`;
  const bottom =
    state === "demo" ? "Made-up data"
    : state === "expired" ? "Sign in needed"
    : state === "syncing" ? "Syncing…"
    : syncedAgo(sync?.lastSyncAt) || "Not synced yet";
  return (
    <div className="sb-sync" data-tip="Settings" data-tip-sub={`${top}. ${bottom}`}>
      <span className={`sb-sync-dot is-${state}`} aria-hidden />
      <span className="sb-sync-text" role="status">
        <span className="sb-sync-top">{top}</span>
        <span className="sb-sync-bottom">{bottom}</span>
      </span>
      <button type="button" className="sb-icon-btn" aria-label="Settings" onClick={onSettings}>
        <Icon name="settings" size={16} />
      </button>
    </div>
  );
}

/**
 * The rail's hover and focus label. One fixed label outside the scrolling rail, so it is never clipped.
 * Esc hides it; the real names stay in the DOM (visually hidden) for screen readers.
 */
function useRailTip(enabled) {
  const [tip, setTip] = useState(null);
  const show = (el) => {
    const t = el?.closest?.("[data-tip]");
    if (!t) return setTip(null);
    const r = t.getBoundingClientRect();
    setTip({ text: t.dataset.tip, sub: t.dataset.tipSub, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hide = () => setTip(null);
  useEffect(() => {
    if (!tip) return undefined;
    const onKey = (e) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tip]);
  if (!enabled) return { handlers: {}, tip: null };
  return {
    tip,
    handlers: {
      onPointerOver: (e) => e.pointerType === "mouse" && show(e.target),
      onPointerLeave: hide,
      onFocus: (e) => (e.target.matches?.(":focus-visible") ? show(e.target) : hide()),
      onBlur: hide,
      onScroll: hide,
      onClick: hide,
    },
  };
}

/**
 * Left sidebar: brand, search, main screens, the student's courses, Campus, and the sync box.
 * `rail`: icons only, with the name on hover or keyboard focus (the desktop sidebar). The drawer shows names.
 */
export function Sidebar({ route, courses, onSearch, syncBox, rail = false }) {
  const on = (name) => route.name === name;
  const { tip, handlers } = useRailTip(rail);
  return (
    <nav className={`sb${rail ? " is-rail" : ""}`} aria-label="Main" {...handlers}>
      <a className="sb-brand" href={routeHref("home")} data-tip={APP_NAME} data-tip-sub="Home">
        <Brand />
      </a>
      <button type="button" className="sb-search" onClick={onSearch} aria-label={rail ? "Search everything" : undefined} data-tip="Search everything" data-tip-sub={searchKeys()}>
        <Icon name="search" size={rail ? 18 : 15} />
        <span className="sb-search-text">Search everything</span>
        <kbd className="sb-kbd">{searchKeys()}</kbd>
      </button>

      <NavItem href={routeHref("home")} icon="home" active={on("home")}>Home</NavItem>
      <NavItem href={routeHref("calendar")} icon="calendar" active={on("calendar")}>Calendar</NavItem>
      <NavItem href={routeHref("ask")} icon="ask" active={on("ask")}>Ask</NavItem>

      {courses.length ? <div className="sb-section">Courses</div> : null}
      {courses.map((c) => (
        <CourseItem key={c.id} c={c} rail={rail} active={on("course") && route.parts[0] === c.id} />
      ))}

      <div className="sb-section">Campus</div>
      <NavItem href={routeHref("campus")} icon="book" active={on("campus") && route.parts[0] !== "clubs"}>Resources</NavItem>
      <NavItem href={routeHref("campus", ["clubs"])} icon="users" active={on("campus") && route.parts[0] === "clubs"}>Clubs</NavItem>
      <NavItem href={routeHref("events")} icon="ticket" active={on("events")}>Events</NavItem>
      <NavItem href={routeHref("map")} icon="map" active={on("map")}>Map</NavItem>

      <div className="sb-spacer" />
      {syncBox}
      {tip ? (
        <span className="sb-tip" style={{ top: tip.top, left: tip.left }} aria-hidden>
          {tip.text}
          {tip.sub ? <span className="sb-tip-sub">{tip.sub}</span> : null}
        </span>
      ) : null}
    </nav>
  );
}
