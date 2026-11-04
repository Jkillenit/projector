import { useEffect, useState } from "react";
import { fromCalendarEvents, fromSourceEvents, mergeEvents } from "./campusEvents.js";

/** Upcoming events: made-up ones in Demo mode, The SOURCE plus UA's calendar in Live mode. */
export function useCampusEvents() {
  const [state, setState] = useState({ status: "loading", events: [], stale: false, down: [] });
  useEffect(() => {
    let live = true;
    Promise.resolve(window.studyHub?.events?.list?.() ?? { ok: false })
      .catch(() => ({ ok: false }))
      .then((res) => {
        if (!live) return;
        // UA's calendar first: it has rooms and in-person or virtual, so it wins a repeat.
        const lists = res.source === "live" ? [fromCalendarEvents(res.calendarRows), fromSourceEvents(res.sourceRows)] : [res.events || []];
        setState({ status: res.ok ? "ready" : "error", events: mergeEvents(lists), stale: !!res.stale, down: res.down || [] });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
