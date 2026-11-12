import { useEffect, useState } from "react";
import { Button, Card } from "../../components/ui/index.jsx";
import { loadIndoor } from "./indoor/indoorFiles.js";

/** Settings: "Indoor maps on this computer" (#63). Lists the buildings we can walk you through and the files we skipped. */
export function IndoorCard({ mode }) {
  const [reads, setReads] = useState(0);
  const [state, setState] = useState(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    let live = true;
    void loadIndoor({ fresh: true }).then((r) => live && setState(r));
    return () => {
      live = false;
    };
  }, [reads]);

  const open = async () => {
    const r = await window.studyHub?.indoor?.openFolder?.();
    setNote(r?.ok ? "" : r?.error || "Could not open the folder.");
  };

  return (
    <Card aria-labelledby="set-indoor">
      <h2 id="set-indoor" className="t-heading">Indoor maps on this computer</h2>
      <p className="t-small t-muted">
        {mode === "live"
          ? "Put a building's .indoor.json file in this folder to get walks inside it. The files stay on this computer."
          : "Demo mode has one made-up building."}
      </p>
      {state?.buildings.length ? (
        <ul className="t-small">{state.buildings.map((b) => <li key={b.building}>{b.name}</li>)}</ul>
      ) : state ? (
        <p className="t-small t-muted">No indoor maps yet.</p>
      ) : null}
      {state?.skipped.length ? (
        <div className="t-small">
          <p>We skipped these files:</p>
          <ul>
            {state.skipped.map((s) => (
              <li key={s.file}>{s.file}: {s.problems.slice(0, 3).join(". ")}{s.problems.length > 3 ? `, and ${s.problems.length - 3} more` : ""}.</li>
            ))}
          </ul>
        </div>
      ) : null}
      {mode === "live" ? (
        <div className="ui-chips">
          <Button variant="outline-sm" size="sm" onClick={open}>Open folder</Button>
          <Button variant="quiet" size="sm" onClick={() => setReads((n) => n + 1)}>Check again</Button>
        </div>
      ) : null}
      {note ? <p className="t-small t-muted" role="status">{note}</p> : null}
    </Card>
  );
}
