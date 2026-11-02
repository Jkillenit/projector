import { useState } from "react";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { setMotionPref, useReducedMotion } from "../../shell/motion.js";
import { INTEREST_OPTIONS } from "../../platform/profile.js";
import { BlackboardSyncPanel } from "../blackboard/BlackboardSyncPanel.jsx";
import { BlackboardTab } from "./BlackboardTab.jsx";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

export function SettingsScreen({ profile, onProfile, theme, onTheme, userCourses, mode }) {
  const reduced = useReducedMotion();
  const [confirm, setConfirm] = useState(false);

  const toggleInterest = (name) =>
    onProfile({ interests: profile.interests.includes(name) ? profile.interests.filter((x) => x !== name) : [...profile.interests, name] });

  const reset = () => {
    window.studyHub.app.resetDemo();
    window.location.reload();
  };

  return (
    <div className="fd-screen">
      <h1 className="fd-title">Settings</h1>

      <section className="fd-panel">
        <h2 className="fd-h2">About you</h2>
        <label className="fd-field">
          <span>Name</span>
          <input className="fd-input" value={profile.name} onChange={(e) => onProfile({ name: e.target.value })} />
        </label>
        <label className="fd-field">
          <span>Class year</span>
          <select className="fd-input" value={profile.classYear} onChange={(e) => onProfile({ classYear: e.target.value })}>
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <div className="fd-field">
          <span>Interests</span>
          <div className="fd-chip-row">
            {INTEREST_OPTIONS.map((name) => (
              <button key={name} type="button" className={`fd-chip${profile.interests.includes(name) ? " is-on" : ""}`} aria-pressed={profile.interests.includes(name)} onClick={() => toggleInterest(name)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="fd-panel">
        <h2 className="fd-h2">Look</h2>
        <label className="fd-switch-row">
          <span>Light theme</span>
          <input type="checkbox" className="sh-switch" checked={theme === "light"} onChange={(e) => onTheme(e.target.checked ? "light" : "dark")} />
        </label>
        <label className="fd-switch-row">
          <span>Reduce motion</span>
          <input type="checkbox" className="sh-switch" checked={reduced} onChange={(e) => setMotionPref(e.target.checked)} />
        </label>
      </section>

      {mode === "live" ? (
        <>
          <BlackboardTab />
          <section className="fd-panel">
            <BlackboardSyncPanel userCourses={userCourses} onSynced={() => {}} />
          </section>
        </>
      ) : (
        <section className="fd-panel">
          <h2 className="fd-h2">Demo data</h2>
          <p className="fd-meta">Everything here is made up. Real Blackboard is at <a href={BLACKBOARD_URL} target="_blank" rel="noopener noreferrer">{BLACKBOARD_URL}</a>. Resetting puts the demo back the way it started.</p>
          {confirm ? (
            <div className="fd-welcome-actions">
              <button type="button" className="fd-btn fd-btn--small" onClick={reset}>Yes, reset the demo</button>
              <button type="button" className="fd-link" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="fd-btn fd-btn--small" onClick={() => setConfirm(true)}>Reset demo data</button>
          )}
        </section>
      )}
    </div>
  );
}
