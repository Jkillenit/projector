import { Card, Pill, StepList, TextLink } from "../../components/ui/index.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clock = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

/** One class's tutoring session (#211): when, where, how to sign up, and its pin. */
export function SessionCard({ s }) {
  const where = s.place ? [s.place.name, s.room].filter(Boolean).join(" ") : s.where;
  return (
    <Card className="ask-res">
      <div className="ask-res-head">
        <h3 className="ask-res-name">{s.title}</h3>
        {s.demo ? <Pill tone="neutral">Demo</Pill> : null}
      </div>
      <p className="t-small t-muted">{`${(s.days || []).map((d) => DAYS[d]).join(", ")} · ${clock(s.start)} to ${clock(s.end)} · ${where}`}</p>
      <StepList steps={s.signUp || []} />
      <span className="show-on-map">
        {s.mapHref ? <TextLink href={s.mapHref}>Show on map</TextLink> : null}
        {s.locationNote ? <span className="t-small t-faint">{s.locationNote}</span> : null}
      </span>
    </Card>
  );
}
