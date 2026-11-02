import { useState } from "react";
import students from "../../demo/students.json";
import { APP_NAME } from "../../constants/app.js";

/** Two steps: pick a demo student, then land on Home. No name prompt. */
export function WelcomeScreen({ onPick }) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState(null);

  return (
    <div className="fd-welcome">
      <div className="fd-welcome-card">
        <p className="fd-step">Step {step} of 2</p>
        {step === 1 ? (
          <>
            <h1 className="fd-title">{APP_NAME}</h1>
            <p className="fd-lede">Sign in once. See what is due, what is new, and which campus help fits you right now. This is a mockup with made-up data.</p>
            <h2 className="fd-h2">Pick a demo student</h2>
            <ul className="fd-card-list">
              {students.map((s) => (
                <li key={s.id} className="fd-card fd-card--click">
                  <button
                    type="button"
                    className="fd-card-button"
                    onClick={() => {
                      setPicked(s);
                      setStep(2);
                    }}
                  >
                    <span className="fd-card-head"><strong>{s.name}</strong><span className="fd-tag">{s.class_year}{s.transfer ? ", transfer" : ""}</span></span>
                    <span className="fd-why">{s.major}. Likes {s.interests.join(", ")}.</span>
                    <span className="fd-meta">{s.schedule_note}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1 className="fd-title">You are in, {picked.name}</h1>
            <p className="fd-lede">We loaded {picked.name}'s four classes, grades and interests. Nothing here is real, and nothing leaves your browser.</p>
            <div className="fd-welcome-actions">
              <button type="button" className="fd-btn" onClick={() => onPick(picked.id)}>Go to Home</button>
              <button type="button" className="fd-link" onClick={() => setStep(1)}>Pick someone else</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
