import { useState } from "react";
import students from "../../demo/students.json";
import { Button, Card, Chip, Segmented, TextLink } from "../../components/ui/index.jsx";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { setMotionPref, useReducedMotion } from "../../shell/motion.js";
import { INTEREST_OPTIONS } from "../../platform/profile.js";
import { BlackboardSyncPanel } from "../blackboard/BlackboardSyncPanel.jsx";
import { SyncBar } from "../blackboard/SyncBar.jsx";
import { BlackboardTab } from "./BlackboardTab.jsx";
import { ConnectionsCard } from "./ConnectionsCard.jsx";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

export function SettingsScreen({ profile, onProfile, onPickStudent, theme, onTheme, userCourses, mode, sync }) {
  const reduced = useReducedMotion();
  const [confirm, setConfirm] = useState(false);

  const toggleInterest = (name) =>
    onProfile({ interests: profile.interests.includes(name) ? profile.interests.filter((x) => x !== name) : [...profile.interests, name] });

  const reset = () => {
    window.studyHub.app.resetDemo();
    window.location.reload();
  };

  return (
    <div className="page set-page">
      <header className="page-head">
        <h1 className="t-display">Settings</h1>
      </header>

      <Card aria-labelledby="set-you">
        <h2 id="set-you" className="t-heading">About you</h2>
        <label className="set-field">
          <span>Name</span>
          <input className="ui-input" value={profile.name} onChange={(e) => onProfile({ name: e.target.value })} />
        </label>
        <label className="set-field">
          <span>Class year</span>
          <select className="ui-input" value={profile.classYear} onChange={(e) => onProfile({ classYear: e.target.value })}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <div className="set-field">
          <span>Interests</span>
          <div className="ui-chips">
            {INTEREST_OPTIONS.map((name) => (
              <Chip key={name} filter pressed={profile.interests.includes(name)} onClick={() => toggleInterest(name)}>{name}</Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card aria-labelledby="set-look">
        <h2 id="set-look" className="t-heading">Look</h2>
        <div className="set-field">
          <span>Theme</span>
          <div className="set-seg">
            <Segmented label="Theme" options={[["dark", "Dark"], ["light", "Light"], ["system", "System"]]} value={theme} onChange={onTheme} />
          </div>
        </div>
        <label className="set-switch">
          <span>Reduce motion</span>
          <input type="checkbox" checked={reduced} onChange={(e) => setMotionPref(e.target.checked)} />
        </label>
      </Card>

      <ConnectionsCard mode={mode} />

      {mode === "live" ? (
        <>
          <BlackboardTab />
          <Card><SyncBar sync={sync} /><BlackboardSyncPanel userCourses={userCourses} onSynced={() => {}} /></Card>
        </>
      ) : (
        <Card aria-labelledby="set-demo">
          <h2 id="set-demo" className="t-heading">Demo</h2>
          <div className="set-field">
            <span>Demo student</span>
            <div className="set-seg">
              <Segmented label="Demo student" options={students.map((s) => [s.id, s.name])} value={profile.studentId} onChange={onPickStudent} />
            </div>
          </div>
          <p className="t-small t-muted">
            Everything here is made up. Real Blackboard is at <TextLink href={BLACKBOARD_URL} external>{BLACKBOARD_URL.replace("https://", "")}</TextLink>. Resetting puts the demo back the way it started.
          </p>
          {confirm ? (
            <div className="ui-chips">
              <Button variant="outline-sm" size="sm" onClick={reset}>Yes, reset the demo</Button>
              <Button variant="quiet" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          ) : (
            <div><Button variant="outline-sm" size="sm" onClick={() => setConfirm(true)}>Reset demo data</Button></div>
          )}
        </Card>
      )}
    </div>
  );
}
