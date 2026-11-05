import { useEffect, useState } from "react";

/** This week's classes from the myBama connection (demo: made-up). `notConnected` until the student connects it. */
export function useMyClasses() {
  const [state, setState] = useState({ status: "loading", meetings: [], noMeetingTime: [] });
  useEffect(() => {
    let live = true;
    Promise.resolve(window.studyHub?.connections?.mybamaWeek?.() ?? { ok: false, notConnected: true })
      .catch(() => ({ ok: false }))
      .then((res) => {
        if (!live) return;
        setState({
          status: res.ok ? "ready" : res.notConnected ? "notConnected" : res.signedOut ? "signedOut" : "error",
          meetings: res.meetings || [],
          noMeetingTime: res.noMeetingTime || [],
          stale: !!res.stale,
          signedOut: !!res.signedOut,
        });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
