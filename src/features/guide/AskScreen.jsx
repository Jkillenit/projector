import { useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import { Button, Card, Chip, Icon, Pill, StepList, TextLink } from "../../components/ui/index.jsx";
import { loadJson, saveJson } from "../../lib/storage.js";
import { toStudent } from "../../platform/profile.js";
import { routeHref } from "../../shell/useRoute.js";
import { checkedLabel, signInNeeded, siteUrl, sourceName, stepsOf } from "../resources/resourceView.js";
import { ASK_COPY, EXAMPLE_QUESTIONS } from "./copy.js";
import { match, orgsAsResources } from "./matcher.js";

const FEEDBACK_KEY = "fd.askFeedback";
const COUNT = ["", "One place fits.", "Two places fit.", "Three places fit."];

/** Local log for the user testing doc: the answer type and whether it helped. Never the question text. */
function logFeedback(result, helped) {
  const entry = { at: new Date().toISOString(), kind: result.kind, resources: result.items.map((i) => i.resource.id), helped };
  saveJson(FEEDBACK_KEY, [...loadJson(FEEDBACK_KEY, []), entry].slice(-200));
}

function SignInPill({ r }) {
  return signInNeeded(r) ? <Pill tone="warn">UA sign in</Pill> : <Pill tone="good">No sign in needed</Pill>;
}

function ResourceAnswer({ item }) {
  const r = item.resource;
  const url = siteUrl(r);
  return (
    <Card className="ask-res">
      <div className="ask-res-head">
        <h3 className="ask-res-name">{r.name}</h3>
        <SignInPill r={r} />
      </div>
      <p className="ask-why"><span className="ask-why-label">{ASK_COPY.whyThis}</span> {item.why}</p>
      <StepList steps={stepsOf(r)} />
      <div className="card-foot">
        <span>Source: {sourceName(r)}</span>
        <span>{checkedLabel(r)}</span>
        {url ? <TextLink href={url} external className="card-foot-end">Open site</TextLink> : r.id.startsWith("org-") ? null : <TextLink href={routeHref("campus", ["r", r.id])} arrow className="card-foot-end">See details</TextLink>}
      </div>
    </Card>
  );
}

function Helped({ result }) {
  const [sent, setSent] = useState(false);
  if (sent) return <p className="t-small t-faint">{ASK_COPY.thanks}</p>;
  const send = (helped) => {
    logFeedback(result, helped);
    setSent(true);
  };
  return (
    <div className="ask-helped">
      <span className="t-small t-muted">{ASK_COPY.helped}</span>
      <Button variant="outline-sm" size="sm" onClick={() => send(true)}>{ASK_COPY.helpedYes}</Button>
      <Button variant="outline-sm" size="sm" onClick={() => send(false)}>{ASK_COPY.helpedNo}</Button>
    </div>
  );
}

function Answer({ result }) {
  if (result.kind === "crisis") {
    const counseling = resources.find((r) => r.id === result.contacts[1].resourceId);
    // Only a verified link or phone number from the resources data is used. Never a typed-in number.
    const href = counseling?.phone ? `tel:${counseling.phone}` : siteUrl(counseling || {}) || routeHref("campus", ["r", "counseling-center"]);
    return (
      <section className="ask-crisis" role="alert">
        <h2 className="ask-crisis-title">{ASK_COPY.crisisTitle}</h2>
        <p className="t-body-lg ask-text-2">{ASK_COPY.crisisLine}</p>
        <div className="ask-crisis-btns">
          <a className="ask-crisis-btn is-call" href="tel:988">
            <strong>{ASK_COPY.crisisCall}</strong>
            <span>{ASK_COPY.crisisCallSub}</span>
          </a>
          <a className="ask-crisis-btn" href={href} {...(siteUrl(counseling || {}) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <strong>{ASK_COPY.crisisCounseling}</strong>
            <span>{ASK_COPY.crisisCounselingSub}</span>
          </a>
        </div>
        <p className="t-muted">{ASK_COPY.danger}</p>
      </section>
    );
  }
  if (result.kind === "sensitive") {
    const r = result.items[0]?.resource;
    const url = r && siteUrl(r);
    return (
      <div className="stack">
        <p className="ask-private">
          <Icon name="lock" size={16} className="ask-private-icon" />
          {ASK_COPY.privateStrip}
        </p>
        {r ? (
          <Card className="ask-office">
            <span className="t-label t-faint">{ASK_COPY.officeLabel}</span>
            <h3 className="ask-office-name">{r.name}</h3>
            <p className="t-muted">{r.description}</p>
            {url ? (
              <Button href={url} external>Visit the {r.name} site</Button>
            ) : (
              <Button href={routeHref("campus", ["r", r.id])}>How to reach the {r.name}</Button>
            )}
          </Card>
        ) : null}
      </div>
    );
  }
  if (result.kind === "matched") {
    return (
      <div className="stack">
        <p className="ask-lead">{COUNT[result.items.length] || `${result.items.length} places fit.`}</p>
        {result.items.map((item) => <ResourceAnswer key={item.resource.id} item={item} />)}
        <Helped result={result} />
      </div>
    );
  }
  return (
    <div className="stack">
      <p className="ask-lead">{ASK_COPY.notSure}</p>
      <div className="ask-two">
        <Card as="a" className="ask-pick" href={routeHref("campus")}>
          <span className="t-label t-faint">{ASK_COPY.browseLabel}</span>
          <span className="t-heading">{ASK_COPY.browseTitle}</span>
          <span className="t-small t-muted">{ASK_COPY.browseText}</span>
        </Card>
        <Card as="a" className="ask-pick" href={routeHref("campus", ["r", "academic-advising"])}>
          <span className="t-label t-faint">{ASK_COPY.personLabel}</span>
          <span className="t-heading">{ASK_COPY.personTitle}</span>
          <span className="t-small t-muted">{ASK_COPY.personText}</span>
        </Card>
      </div>
    </div>
  );
}

/**
 * The scripted guide. Crisis and private topics are checked first by the matcher, before anything else,
 * and nothing on this screen is saved: the conversation lives in memory and is gone when you leave.
 * `seed`: { text, prefill } to ask right away, or with `prefill` just to put in the box.
 */
export function AskScreen({ profile, seed }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState([]);
  const pool = useMemo(() => [...resources, ...orgsAsResources(organizations)], []);
  const student = useMemo(() => toStudent(profile), [profile]);
  const ranSeed = useRef(null);
  const endRef = useRef(null);

  const ask = (q) => {
    const question = q.trim();
    if (!question) return;
    const result = match(question, student, pool);
    // A crisis answer clears the screen so nothing else competes with it.
    setTurns((t) => (result.kind === "crisis" ? [{ question, result }] : [...t.filter((x) => x.result.kind !== "crisis"), { question, result }]));
    setText("");
  };

  useEffect(() => {
    if (seed && ranSeed.current !== seed) {
      ranSeed.current = seed;
      if (seed.prefill) setText(seed.text);
      else ask(seed.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView?.({ block: "end" });
  }, [turns]);

  const crisis = turns.some((t) => t.result.kind === "crisis");
  return (
    <div className={`ask-page${crisis ? " is-crisis" : ""}`}>
      <header className="page-head">
        <h1 className="ask-title">{ASK_COPY.title}</h1>
        <p className="t-muted">{ASK_COPY.intro}</p>
        <p className="t-small t-faint">{ASK_COPY.mockup}</p>
      </header>

      <div className="ask-thread">
        {turns.length ? (
          turns.map((t, i) => (
            <div key={i} className="ask-turn">
              <p className="ask-you">{t.question}</p>
              <Answer result={t.result} />
            </div>
          ))
        ) : (
          <div className="ui-chips">
            {EXAMPLE_QUESTIONS.map((q) => <Chip key={q} onClick={() => ask(q)}>{q}</Chip>)}
          </div>
        )}
        <span ref={endRef} />
      </div>

      <div className="ask-dock">
        <form className="ask-bar" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <label className="vh" htmlFor="ask-input">Your question</label>
          <input id="ask-input" className="ask-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={turns.length ? ASK_COPY.placeholderFollowUp : ASK_COPY.placeholderEmpty} autoComplete="off" />
          <Button type="submit" variant={crisis ? "secondary" : "primary"} size="lg" disabled={!text.trim()}>{ASK_COPY.button}</Button>
        </form>
        <p className="ask-foot">{ASK_COPY.footer}</p>
      </div>
    </div>
  );
}
