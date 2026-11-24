import { useEffect, useState } from "react";
import students from "../../demo/students.json";
import { Button, Card, Chip, Segmented, TextLink } from "../../components/ui/index.jsx";
import { BLACKBOARD_URL, DISCLAIMER } from "../../constants/app.js";
import { setMotionPref, useReducedMotion } from "../../shell/motion.js";
import { INTEREST_OPTIONS } from "../../platform/profile.js";
import { BlackboardSyncPanel } from "../blackboard/BlackboardSyncPanel.jsx";
import { SyncBar } from "../blackboard/SyncBar.jsx";
import { BlackboardTab } from "./BlackboardTab.jsx";
import { ConnectionsCard } from "./ConnectionsCard.jsx";
import { checkEmail, checkPhone, cleanPhone } from "./contact.js";
import { IndoorCard } from "../map/IndoorCard.jsx";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

/**
 * An email or phone field (#214). It saves when you leave the field, and only when the value passes its check;
 * otherwise it says what to fix. Saved on this computer only. Nothing is sent from here.
 */
function ContactField({ id, label, type, value, check, clean = (s) => s.trim(), onSave, hint }) {
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState(null);
  useEffect(() => setDraft(value || ""), [value]);
  const save = () => {
    const problem = check(draft);
    setError(problem);
    if (!problem && clean(draft) !== (value || "")) onSave(clean(draft));
  };
  return (
    <div className="set-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="ui-input"
        type={type}
        value={draft}
        autoComplete={type === "email" ? "email" : "tel"}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-note`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <span id={`${id}-note`} className={`t-small ${error ? "set-error" : "t-faint"}`} role={error ? "alert" : undefined}>{error || hint}</span>
    </div>
  );
}

/** Profile (#214): who you are, how clubs can reach you, and your connections. `#/settings` still opens it. */
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
        <h1 className="t-display">Profile</h1>
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

      <Card aria-labelledby="set-contact">
        <h2 id="set-contact" className="t-heading">Contact</h2>
        <p className="t-small t-muted">For club newsletters. Saved on this computer only. Nothing is sent until you subscribe and confirm.</p>
        <ContactField id="set-email" label="Email" type="email" value={profile.email} check={checkEmail} onSave={(email) => onProfile({ email })} hint="Your UA email works best." />
        <ContactField id="set-phone" label="Phone (optional)" type="tel" value={profile.phone} check={checkPhone} clean={cleanPhone} onSave={(phone) => onProfile({ phone })} hint="Only if you want texts from a club." />
      </Card>

      <Card aria-labelledby="set-bb">
        <h2 id="set-bb" className="t-heading">Blackboard</h2>
        {mode === "live" ? (
          <p className="t-small t-muted">You sign in on Blackboard's own page. AL reads your courses and never changes anything there. Sync and sign in are below.</p>
        ) : (
          <p className="t-small t-muted">
            Demo mode: the courses are made up. In the desktop app you sign in on Blackboard's own page, and AL reads your courses. It never asks for your password.
          </p>
        )}
      </Card>

      <Card aria-labelledby="set-look">
        <h2 id="set-look" className="t-heading">Look</h2>
        <div className="set-field">
          <span>Theme</span>
          <div className="set-seg">
            <Segmented label="Theme" options={[["light", "Light"], ["dark", "Dark"], ["system", "System"]]} value={theme} onChange={onTheme} />
          </div>
        </div>
        <label className="set-switch">
          <span>Reduce motion</span>
          <input type="checkbox" checked={reduced} onChange={(e) => setMotionPref(e.target.checked)} />
        </label>
      </Card>

      <ConnectionsCard mode={mode} />

      <IndoorCard mode={mode} />

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

      <p className="t-small t-faint">{DISCLAIMER}</p>
    </div>
  );
}
