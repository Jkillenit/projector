import { useState } from "react";
import { Button } from "../../components/ui/index.jsx";
import { localDayKey } from "../../lib/dates.js";
import { PLACES } from "./places.js";
import { KINDS, makeSession } from "./mySessions.js";

const PLACE_NAMES = PLACES.map((p) => p.name).sort();

/** "Add my session": what, when and where. `initial` can prefill kind and title (from a tutoring resource). */
export function AddSession({ initial, onAdd, onCancel }) {
  const [f, setF] = useState({ kind: initial?.kind || "tutoring", title: initial?.title || "", date: localDayKey(new Date()), start: "", end: "", where: "", room: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const res = makeSession(f);
    if (!res.ok) return setError(res.error);
    onAdd(res.session);
  };
  return (
    <form className="study-form map-add" onSubmit={submit} aria-label="Add a session">
      <h2 className="t-title">Add a session</h2>
      <label className="t-small t-muted" htmlFor="ses-kind">Kind</label>
      <select id="ses-kind" className="ui-input" value={f.kind} onChange={set("kind")}>
        {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <label className="t-small t-muted" htmlFor="ses-title">What is it?</label>
      <input id="ses-title" className="ui-input" value={f.title} onChange={set("title")} placeholder="Calc II tutor" />
      <div className="map-add-row">
        <span>
          <label className="t-small t-muted" htmlFor="ses-date">Day</label>
          <input id="ses-date" className="ui-input" type="date" value={f.date} onChange={set("date")} />
        </span>
        <span>
          <label className="t-small t-muted" htmlFor="ses-start">Starts</label>
          <input id="ses-start" className="ui-input" type="time" value={f.start} onChange={set("start")} />
        </span>
        <span>
          <label className="t-small t-muted" htmlFor="ses-end">Ends</label>
          <input id="ses-end" className="ui-input" type="time" value={f.end} onChange={set("end")} />
        </span>
      </div>
      <label className="t-small t-muted" htmlFor="ses-where">Building, or Online</label>
      <input id="ses-where" className="ui-input" list="ses-places" value={f.where} onChange={set("where")} placeholder="Gorgas Library" />
      <datalist id="ses-places">
        {PLACE_NAMES.map((n) => <option key={n} value={n} />)}
      </datalist>
      <label className="t-small t-muted" htmlFor="ses-room">Room (if you know it)</label>
      <input id="ses-room" className="ui-input" value={f.room} onChange={set("room")} placeholder="205" />
      {error ? <p className="t-small" role="alert">{error}</p> : null}
      <p className="t-small t-faint">Saved on this computer only.</p>
      <div className="ui-chips">
        <Button type="submit" variant="primary" size="sm">Add to my map</Button>
        <Button type="button" variant="quiet" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
