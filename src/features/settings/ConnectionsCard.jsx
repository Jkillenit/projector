import { useCallback, useEffect, useState } from "react";
import { Button, Card, Pill } from "../../components/ui/index.jsx";

/** Settings, Connections (rule 5): every service is off until the student connects it, and Disconnect wipes it. */
export function ConnectionsCard({ mode }) {
  const api = window.studyHub?.connections;
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => setRows((await api?.list?.()) || []), [api]);
  useEffect(() => {
    load();
    const off = api?.onChanged?.((next) => next && setRows(next));
    window.addEventListener("focus", load);
    return () => {
      off?.();
      window.removeEventListener("focus", load);
    };
  }, [api, load]);

  const connect = async (row) => {
    setBusy(row.id);
    setError("");
    const res = await api.connect(row.id);
    if (!res?.ok) setError(res?.error || "Could not open the sign-in window.");
    await load();
    setBusy(null);
  };
  const disconnect = async (row) => {
    if (!window.confirm(`Disconnect ${row.name}? This signs you out there and deletes everything Projector saved from it.`)) return;
    setBusy(row.id);
    await api.disconnect(row.id);
    await load();
    setBusy(null);
  };

  if (!api) return null;
  return (
    <Card aria-labelledby="set-conn">
      <h2 id="set-conn" className="t-heading">Connections</h2>
      <p className="t-small t-muted">
        Connect the services you use so the map can show and do more. Each one is off until you turn it on. You sign in on its own page, and Projector never sees your password.
        {mode === "demo" ? " In the demo these are pretend and nothing leaves this page." : ""}
      </p>
      <ul className="conn-list">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="conn-text">
              <span className="t-heading">
                {row.name} {row.connected ? <Pill tone="good" tiny>Connected</Pill> : null}
                {!row.ready ? <Pill tone="neutral" tiny>Coming later</Pill> : null}
              </span>
              <span className="t-small t-muted">Reads: {row.reads}</span>
              <span className="t-small t-muted">Sends: {row.sends}</span>
            </div>
            {row.connected ? (
              <Button size="sm" variant="quiet" disabled={busy === row.id} onClick={() => disconnect(row)}>Disconnect</Button>
            ) : (
              <Button size="sm" disabled={!row.ready || busy === row.id} onClick={() => connect(row)}>Connect</Button>
            )}
          </li>
        ))}
      </ul>
      {mode === "live" && rows.some((r) => r.ready && !r.connected) ? (
        <p className="t-small t-faint">After you sign in, close the window. Projector checks that you are signed in.</p>
      ) : null}
      {error ? <p className="t-small" role="alert">{error}</p> : null}
    </Card>
  );
}
