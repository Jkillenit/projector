import { useEffect, useState } from "react";
import { fromSource } from "./sourceClubs.js";

/** Clubs for the Campus screen: demo clubs in Demo mode, The SOURCE's public list in Live mode. */
export function useClubs() {
  const [state, setState] = useState({ status: "loading", clubs: [], source: null, stale: false });
  useEffect(() => {
    let live = true;
    Promise.resolve(window.studyHub?.clubs?.list?.() ?? { ok: false })
      .catch(() => ({ ok: false }))
      .then((res) => {
        if (!live) return;
        const clubs = res.source === "the-source" ? fromSource(res.rows) : res.rows || [];
        setState({ status: res.ok ? "ready" : "error", clubs, source: res.source || null, stale: !!res.stale });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
