import { useEffect, useState } from "react";

const api = () => (typeof window !== "undefined" ? window.electronAPI : undefined);

/** Desktop app only: a transparent drag strip with the window buttons. Nothing in the browser. */
export function TitleBar() {
  const electron = api();
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

  if (!electron) return null;
  return (
    <header className="titlebar" onDoubleClick={(e) => e.target === e.currentTarget && electron.maximizeWindow?.()}>
      <div className="titlebar-controls">
        <button type="button" className="titlebar-btn" aria-label="Minimize" onClick={() => electron.minimizeWindow()}>−</button>
        <button type="button" className="titlebar-btn" aria-label={maximized ? "Restore" : "Maximize"} onClick={() => electron.maximizeWindow()}>{maximized ? "❐" : "□"}</button>
        <button type="button" className="titlebar-btn titlebar-btn--close" aria-label="Close" onClick={() => electron.closeWindow()}>×</button>
      </div>
    </header>
  );
}
