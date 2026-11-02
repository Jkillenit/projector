import resources from "../../demo/resources.json";
import { checkedText } from "./ResourcesScreen.jsx";

const link = (url) => (String(url).startsWith("http") ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : url);

export function ResourceDetail({ resourceId, onBack }) {
  const r = resources.find((x) => x.id === resourceId);
  if (!r) {
    return (
      <div className="fd-screen">
        <button type="button" className="fd-back" onClick={onBack}>Back to resources</button>
        <div className="fd-empty"><p>We could not find that resource.</p></div>
      </div>
    );
  }
  return (
    <div className="fd-screen">
      <button type="button" className="fd-back" onClick={onBack}>Back to resources</button>
      <h1 className="fd-title">{r.name}</h1>
      <p className="fd-lede">{r.description}</p>
      {r.sensitive ? <p className="fd-meta">This is a private topic. Talk to a person there. We do not save anything about it.</p> : null}

      <h2 className="fd-h2">How to get in</h2>
      <ol className="fd-steps">
        {r.how_to_get_in.map((step, i) => (
          <li key={i}>
            <span>{step.text}</span>
            <span className={`fd-tag${step.login_needed ? " fd-tag--login" : ""}`}>{step.login_needed ? "Login needed" : "No login"}</span>
          </li>
        ))}
      </ol>

      <h2 className="fd-h2">Details</h2>
      <dl className="fd-dl">
        <dt>Hours</dt><dd>{r.hours}</dd>
        <dt>Where</dt><dd>{r.location}</dd>
        <dt>Contact</dt><dd>{r.contact}</dd>
        <dt>Source</dt><dd>{link(r.source_url)}</dd>
        <dt>Checked</dt><dd>{checkedText(r)}{r.verified ? "" : " · Not verified by a person yet"}</dd>
      </dl>
    </div>
  );
}
