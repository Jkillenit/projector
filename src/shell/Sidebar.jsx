import { useEffect, useState } from "react";
import { APP_NAME } from "../constants/app.js";
import { CourseDot, Icon } from "../components/ui/index.jsx";
import { syncedAgo } from "../features/today/syncedAgo.js";
import { useCourseStyle } from "./CourseColors.jsx";
import { routeHref } from "./useRoute.js";

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || "");

function NavItem({ href, icon, active, children }) {
  return (
    <a className="sb-item" href={href} aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={17} />
      <span className="sb-label">{children}</span>
    </a>
  );
}

function CourseItem({ c, active }) {
  return (
    <a className="sb-item sb-course" href={routeHref("course", [c.id, "overview"])} aria-current={active ? "page" : undefined} title={c.hint} style={useCourseStyle(c.id)}>
      <CourseDot />
      <span className="sb-label">{c.label}</span>
      {c.count ? <span className="sb-count num" aria-label={`${c.count} due this week`}>{c.count}</span> : null}
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
    <div className="sb-sync">
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

/** Left sidebar: brand, search, main screens, the student's courses, Campus, and the sync box. */
export function Sidebar({ route, courses, onSearch, syncBox }) {
  const on = (name) => route.name === name;
  return (
    <nav className="sb" aria-label="Main">
      <a className="sb-brand" href={routeHref("home")}>
        <span className="sb-mark" aria-hidden>P</span>
        <span className="sb-name">{APP_NAME}</span>
      </a>
      <button type="button" className="sb-search" onClick={onSearch}>
        <Icon name="search" size={15} />
        <span className="sb-search-text">Search everything</span>
        <kbd className="sb-kbd">{isMac() ? "⌘ K" : "Ctrl K"}</kbd>
      </button>

      <NavItem href={routeHref("home")} icon="home" active={on("home")}>Home</NavItem>
      <NavItem href={routeHref("calendar")} icon="calendar" active={on("calendar")}>Calendar</NavItem>
      <NavItem href={routeHref("ask")} icon="ask" active={on("ask")}>Ask</NavItem>

      {courses.length ? <div className="sb-section">Courses</div> : null}
      {courses.map((c) => (
        <CourseItem key={c.id} c={c} active={on("course") && route.parts[0] === c.id} />
      ))}

      <div className="sb-section">Campus</div>
      <NavItem href={routeHref("campus")} icon="book" active={on("campus") && route.parts[0] !== "clubs"}>Resources</NavItem>
      <NavItem href={routeHref("campus", ["clubs"])} icon="users" active={on("campus") && route.parts[0] === "clubs"}>Clubs</NavItem>
      <NavItem href={routeHref("events")} icon="star" active={on("events")}>Events</NavItem>
      <NavItem href={routeHref("map")} icon="map" active={on("map")}>Map</NavItem>

      <div className="sb-spacer" />
      {syncBox}
    </nav>
  );
}
