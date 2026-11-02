import { useMemo, useState } from "react";
import organizations from "../../demo/organizations.json";
import interests from "../../demo/interests.json";
import { toStudent } from "../../platform/profile.js";
import { meetingText, rankClubs } from "./clubMatch.js";

export function ClubsScreen({ profile, onGoSettings }) {
  const [interest, setInterest] = useState(null);
  const student = useMemo(() => toStudent(profile), [profile]);
  const ranked = useMemo(() => rankClubs(organizations, student, { interest }), [student, interest]);
  const hasInterests = student.interests.length > 0;

  return (
    <div className="fd-screen">
      <h1 className="fd-title">Clubs</h1>
      <p className="fd-lede">Sorted by what you like and when you are free. These clubs are made up for the demo.</p>
      {!hasInterests ? (
        <div className="fd-note">
          Pick some interests in <button type="button" className="fd-link" onClick={onGoSettings}>Settings</button> and the best matches come first.
        </div>
      ) : null}
      <div className="fd-chip-row" role="group" aria-label="Filter by interest">
        <button type="button" className={`fd-chip${interest == null ? " is-on" : ""}`} aria-pressed={interest == null} onClick={() => setInterest(null)}>All</button>
        {interests.map((i) => (
          <button key={i.id} type="button" className={`fd-chip${interest === i.id ? " is-on" : ""}`} aria-pressed={interest === i.id} onClick={() => setInterest(i.id)}>
            {i.name}
          </button>
        ))}
      </div>
      {ranked.length ? (
        <ul className="fd-card-list">
          {ranked.map(({ club, shared, fits }) => (
            <li key={club.id} className="fd-card">
              <div className="fd-card-head">
                <strong>{club.name}</strong>
                {fits ? <span className="fd-tag fd-tag--good">Fits your free time</span> : null}
              </div>
              <p className="fd-why">{club.description}</p>
              <p className="fd-meta">Meets {meetingText(club)}</p>
              <div className="fd-chip-row">
                {club.interests.map((i) => (
                  <span key={i} className={`fd-tag${shared.includes(i) ? " fd-tag--good" : ""}`}>{i}</span>
                ))}
              </div>
              {shared.length ? <p className="fd-meta">Matches your interest in {shared.join(" and ")}.</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="fd-empty"><p>No clubs for that interest yet.</p></div>
      )}
    </div>
  );
}
