import { useEffect, useState } from "react";
import { Button, Card } from "../../components/ui/index.jsx";
import { courseStore } from "../../db/courseStore.js";
import { meetingFromForm, meetingKey, meetingLabel, readMeeting } from "./courseMeeting.js";

const MODES = [
  ["in_person", "In person"],
  ["online_sync", "Online at set times"],
  ["online_async", "Online, no set time"],
  ["hybrid", "In person and online"],
];
const DAYS = [["M", "Mon"], ["T", "Tue"], ["W", "Wed"], ["R", "Thu"], ["F", "Fri"]];

/** "Where it meets" on the course Overview: from the syllabus (or the demo), and the student can fix it. */
export function CourseMeeting({ courseUuid }) {
  const [meeting, setMeeting] = useState(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const m = readMeeting(await courseStore.getSetting(meetingKey(courseUuid)));
      if (alive) setMeeting(m);
    };
    void load();
    window.addEventListener("studyhub-bb-synced", load);
    return () => {
      alive = false;
      window.removeEventListener("studyhub-bb-synced", load);
    };
  }, [courseUuid]);

  const save = async (m) => {
    await courseStore.setSetting(meetingKey(courseUuid), JSON.stringify(m));
    setMeeting(m);
    setEditing(false);
  };

  if (meeting === undefined) return null;
  const label = meetingLabel(meeting);
  return (
    <Card aria-labelledby="ov-meets">
      <div className="card-head">
        <h2 id="ov-meets" className="t-heading">Where it meets</h2>
        {!editing ? <Button variant="quiet" size="sm" onClick={() => setEditing(true)}>{label ? "Fix it" : "Add it"}</Button> : null}
      </div>
      {editing ? (
        <MeetingForm meeting={meeting} onSave={save} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <p>{label || "We don't know where this class meets yet."}</p>
          {meeting?.source === "syllabus" ? <p className="t-small t-faint">From the syllabus. Fix it if it is wrong.</p> : null}
        </>
      )}
    </Card>
  );
}

function MeetingForm({ meeting, onSave, onCancel }) {
  const [f, setF] = useState({
    mode: meeting?.mode || "in_person",
    days: [...(meeting?.days || "")],
    start: meeting?.start || "",
    end: meeting?.end || "",
    building: meeting?.building || "",
    room: meeting?.room || "",
  });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleDay = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] });
  const submit = (e) => {
    e.preventDefault();
    const res = meetingFromForm(f);
    if (res.error) return setError(res.error);
    void onSave(res.meeting);
  };
  const hasTime = f.mode !== "online_async";
  const hasPlace = f.mode === "in_person" || f.mode === "hybrid";

  return (
    <form className="study-form" onSubmit={submit} aria-label="Where the class meets">
      <label className="t-small t-muted" htmlFor="meet-mode">How it meets</label>
      <select id="meet-mode" className="ui-input" value={f.mode} onChange={set("mode")}>
        {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {hasTime ? (
        <>
          <fieldset className="meet-days">
            <legend className="t-small t-muted">Days</legend>
            {DAYS.map(([d, l]) => (
              <label key={d} className="meet-day">
                <input type="checkbox" checked={f.days.includes(d)} onChange={() => toggleDay(d)} /> {l}
              </label>
            ))}
          </fieldset>
          <div className="map-add-row">
            <span>
              <label className="t-small t-muted" htmlFor="meet-start">Starts</label>
              <input id="meet-start" className="ui-input" type="time" value={f.start} onChange={set("start")} />
            </span>
            <span>
              <label className="t-small t-muted" htmlFor="meet-end">Ends</label>
              <input id="meet-end" className="ui-input" type="time" value={f.end} onChange={set("end")} />
            </span>
          </div>
        </>
      ) : null}
      {hasPlace ? (
        <>
          <label className="t-small t-muted" htmlFor="meet-building">Building</label>
          <input id="meet-building" className="ui-input" value={f.building} onChange={set("building")} placeholder="Bidgood Hall" />
          <label className="t-small t-muted" htmlFor="meet-room">Room</label>
          <input id="meet-room" className="ui-input" value={f.room} onChange={set("room")} placeholder="116" />
        </>
      ) : null}
      {error ? <p className="t-small" role="alert">{error}</p> : null}
      <p className="t-small t-faint">Saved on this computer only.</p>
      <div className="ui-chips">
        <Button type="submit" variant="primary" size="sm">Save</Button>
        <Button type="button" variant="quiet" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
