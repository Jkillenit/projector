import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/index.jsx";
import { prepareSend } from "./sendGuard.js";

/**
 * The only way a connection sends anything (rule 5): shows exactly what will be sent and waits for the tap.
 * `action` is { service, verb, summary, payload }; `onSend(payload)` runs only after the student taps the verb.
 * A payload with grades or course data never gets this far: prepareSend throws, and the dialog says so.
 */
export function ConfirmSend({ action, onSend, onCancel }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const prepared = useMemo(() => {
    try {
      return { ok: true, ...prepareSend(action) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [action]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    return () => d?.open && d.close();
  }, []);

  const send = async () => {
    setBusy(true);
    try {
      await onSend(prepared.payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="confirm-send" aria-labelledby="confirm-send-h" onCancel={onCancel}>
      {prepared.ok ? (
        <>
          <h2 id="confirm-send-h" className="t-title">{prepared.title}</h2>
          {prepared.lines.length ? (
            <ul className="confirm-send-list">
              {prepared.lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          ) : null}
          <p className="t-small t-muted">This is sent, and nothing else:</p>
          <ul className="confirm-send-list t-small">
            {prepared.sent.length ? prepared.sent.map((l) => <li key={l}>{l}</li>) : <li>Nothing about you</li>}
          </ul>
          <div className="ui-chips">
            <Button variant="primary" onClick={send} disabled={busy}>{action.verb}</Button>
            <Button variant="quiet" onClick={onCancel} disabled={busy}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <h2 id="confirm-send-h" className="t-title">Not sent</h2>
          <p className="t-small" role="alert">{prepared.error}</p>
          <Button onClick={onCancel}>Close</Button>
        </>
      )}
    </dialog>
  );
}
