import { useEffect, useState } from "react";
import { APP_NAME } from "../constants/app.js";

const api = () => (typeof window !== "undefined" ? window.electronAPI : undefined);

/** Slim top bar. In the desktop app it also carries the window buttons; the badge says Live or Demo. */
export function TitleBar() {
  const electron = api();
  const mode = window.studyHub?.mode === "live" ? "live" : "demo";
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!electron?.isMaximized || !electron?.subscribeWindowMaximized) return undefined;
    let cancelled = false;
    electron.isMaximized().then((m) => !cancelled && setMaximized(!!m));
    const unsub = electron.subscribeWindowMaximized(setMaximized);
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [electron]);

  return (
    <header className="sh-titlebar" onDoubleClick={(e) => e.target === e.currentTarget && electron?.maximizeWindow?.()}>
      <div className="sh-titlebar-left">
        <span className="fd-brand">{APP_NAME}</span>
      </div>
      <span className="sh-titlebar-date">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).replace(/,/g, "")}</span>
      <div className="sh-titlebar-right">
        <span className={`fd-badge fd-badge--${mode}`} title={mode === "live" ? "Showing your real Blackboard data" : "Showing made-up demo data"}>
          {mode === "live" ? "Live" : "Demo"}
        </span>
        {electron ? (
          <div className="sh-titlebar-wincontrols">
            <button type="button" className="sh-winbtn" aria-label="Minimize" onClick={() => electron.minimizeWindow()}>−</button>
            <button type="button" className="sh-winbtn" aria-label={maximized ? "Restore" : "Maximize"} onClick={() => electron.maximizeWindow()}>{maximized ? "❐" : "□"}</button>
            <button type="button" className="sh-winbtn sh-winbtn--close" aria-label="Close" onClick={() => electron.closeWindow()}>×</button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
