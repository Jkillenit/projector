import { useState } from "react";
import students from "../../demo/students.json";
import { Button, Card, Pill } from "../../components/ui/index.jsx";
import { APP_NAME } from "../../constants/app.js";

/** Two steps: pick a demo student, then land on Home. No name prompt. */
export function WelcomeScreen({ onPick }) {
  const [picked, setPicked] = useState(null);

  return (
    <main className="welcome">
      <div className="welcome-inner">
        <span className="sb-brand welcome-brand">
          <span className="sb-mark" aria-hidden>P</span>
          <span className="sb-name">{APP_NAME}</span>
        </span>
        {!picked ? (
          <>
            <div className="page-head">
              <h1 className="t-display">Pick a demo student</h1>
              <p className="page-sub">Sign in once. See what is due, what is new, and which campus help fits you right now. This is a mockup with made-up data.</p>
            </div>
            <div className="welcome-grid">
              {students.map((s) => (
                <Card key={s.id} as="button" type="button" className="welcome-card" onClick={() => setPicked(s)}>
                  <span className="welcome-card-head">
                    <span className="t-title">{s.name}</span>
                    <Pill>{s.class_year}{s.transfer ? ", transfer" : ""}</Pill>
                  </span>
                  <span className="t-muted">{s.major}. Likes {s.interests.join(", ")}.</span>
                  <span className="t-small t-faint">{s.schedule_note}</span>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="page-head">
              <h1 className="t-display">You are in, {picked.name}</h1>
              <p className="page-sub">We loaded {picked.name}'s classes, grades and interests. Nothing here is real, and nothing leaves your browser.</p>
            </div>
            <div className="ui-chips">
              <Button variant="primary" size="lg" onClick={() => onPick(picked.id)}>Go to Home</Button>
              <Button variant="quiet" size="lg" onClick={() => setPicked(null)}>Pick someone else</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
