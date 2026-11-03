import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Icon, ProgressBar, Segmented, Skeleton } from "../../components/ui/index.jsx";
import { courseStore } from "../../db/courseStore.js";
import { parseSyllabusGrading } from "../import/syllabusImport.js";
import { formatPct } from "../today/priority.js";
import { categoryStanding, computeCourseGrade } from "./courseGrade.js";
import { letterFor, neededFor, nextLetterUp, projectedFor, verdict } from "./gradeMath.js";
import { useCourseGrade } from "./useCourseGrade.js";

const DEFAULT_SCALE = { A: 90, B: 80, C: 70, D: 60 };
const SOURCE_KEY = (uuid) => `grades.weightsSource.${uuid}`;
const pct = (n, digits = 1) => (n == null ? "—" : `${Number(n).toFixed(digits).replace(/\.0$/, "")}%`);

function StandCard({ current, letter, st, remaining }) {
  const names = remaining.slice(0, 3).map((r) => r.title).join(", ");
  return (
    <Card className="gr-stand">
      <div className="gr-stand-num">
        <span className="t-small t-faint gr-label">Where you stand now</span>
        <span className="gr-big">
          <span className="num gr-big-pct">{formatPct(current)}%</span>
          {letter ? <span className="gr-letter">{letter}</span> : null}
        </span>
      </div>
      <div className="gr-stand-bar">
        <span className="t-small t-muted gr-line">
          <span>Graded so far</span>
          <span><span className="num">{Math.round(st.doneW)}%</span> of course</span>
        </span>
        <ProgressBar value={st.doneW} height={8} label="Share of the grade already graded" />
        <span className="gr-note">
          {st.leftW > 0 ? `${Math.round(st.leftW)}% still to come${names ? `: ${names}${remaining.length > 3 ? " and more" : ""}` : ""}` : "This grade is final."}
        </span>
      </div>
    </Card>
  );
}

function WeightsCard({ cats, pointsBased, source, onSave, onUpload, status }) {
  const [draft, setDraft] = useState(null);
  const total = draft ? draft.reduce((s, c) => s + (Number(c.weight) || 0), 0) : 0;
  const start = () => setDraft(pointsBased ? [{ uuid: crypto.randomUUID(), name: "", weight: "" }] : cats.map((c) => ({ uuid: c.uuid, name: c.name, weight: Math.round(c.weight * 10) / 10 })));
  const set = (i, patch) => setDraft((d) => d.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <Card className="gr-weights">
      <div className="gr-weights-head">
        <h2 className="t-heading">Grade weights</h2>
        <span className="t-label t-faint">{pointsBased ? "From points" : source === "manual" ? "Set by you" : "Read from syllabus"}</span>
        {draft ? null : <Button variant="outline-sm" size="sm" onClick={start}>{pointsBased ? "Add weights" : "Edit weights"}</Button>}
      </div>
      {pointsBased && !draft ? <p className="gr-points-note t-small t-muted">Using points. Add weights from your syllabus for a better estimate.</p> : null}
      {status ? <p className="gr-points-note t-small t-muted" role="status">{status}</p> : null}
      <div className="table-wrap">
        <table className="gr-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num-col">Weight</th>
              {draft ? null : <th scope="col" className="num-col">Graded</th>}
              {draft ? null : <th scope="col" className="num-col">Your score</th>}
            </tr>
          </thead>
          <tbody>
            {draft
              ? draft.map((c, i) => (
                  <tr key={c.uuid}>
                    <td><input className="ui-input gr-in-name" aria-label="Category name" value={c.name} onChange={(e) => set(i, { name: e.target.value })} /></td>
                    <td className="num-col"><input className="ui-input gr-in-num num" type="number" min="0" max="100" aria-label={`${c.name || "Category"} weight percent`} value={c.weight} onChange={(e) => set(i, { weight: e.target.value })} /></td>
                  </tr>
                ))
              : cats.map((c) => (
                  <tr key={c.uuid}>
                    <td className="gr-cat">{c.name}</td>
                    <td className="num-col num t-muted">{pct(c.weight, 0)}</td>
                    <td className="num-col num t-muted">{c.gradedText}</td>
                    <td className="num-col num">{c.score == null ? "—" : pct(c.score)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {draft ? (
        <div className="gr-edit-foot">
          <Button variant="quiet" size="sm" onClick={() => setDraft((d) => [...d, { uuid: crypto.randomUUID(), name: "", weight: "" }])}>Add category</Button>
          <Button variant="quiet" size="sm" onClick={onUpload}>Read a syllabus file</Button>
          <span className={`t-small num gr-total${Math.abs(total - 100) > 0.05 ? " is-off" : ""}`} role="status">
            Total {Math.round(total * 10) / 10}%{Math.abs(total - 100) > 0.05 ? " · should be 100%" : ""}
          </span>
          <Button variant="outline-sm" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
          <Button size="sm" disabled={!draft.some((c) => c.name.trim() && Number(c.weight) > 0)} onClick={async () => { await onSave(draft.filter((c) => c.name.trim())); setDraft(null); }}>Save</Button>
        </div>
      ) : null}
    </Card>
  );
}

function NeedCard({ st, scale, current, remaining, onTarget }) {
  const letters = Object.entries(scale).filter(([l]) => ["A", "B", "C"].includes(l)).sort((a, b) => b[1] - a[1]);
  const [letter, setLetter] = useState(() => nextLetterUp(current, scale));
  const [avg, setAvg] = useState(() => Math.round(current));
  const cut = scale[letter] ?? DEFAULT_SCALE[letter];
  const needed = neededFor(st, cut);
  const final = st.leftW <= 0;
  const v = needed == null ? null : verdict(needed);
  const projected = projectedFor(st, avg);
  return (
    <Card className="gr-need">
      <div>
        <h2 className="t-heading">What do I need?</h2>
        <p className="t-small t-muted">Pick the grade you want.</p>
      </div>
      <Segmented label="Target grade" options={letters.map(([l]) => [l, l])} value={letter} onChange={(l) => { setLetter(l); onTarget(scale[l]); }} />
      {final ? (
        <div className="gr-verdict is-neutral">
          <span className="t-small t-muted">This grade is final.</span>
          <span className="gr-verdict-row"><span className="num gr-verdict-num">{formatPct(st.current)}%</span><span className="gr-verdict-word">{letterFor(st.current, scale)}</span></span>
        </div>
      ) : (
        <div className={`gr-verdict is-${v.tone}`}>
          <span className="t-small t-muted">Average you need on what's left</span>
          <span className="gr-verdict-row">
            <span className="num gr-verdict-num">{needed <= 0 ? "0%" : `${formatPct(needed)}%`}</span>
            <span className="gr-verdict-word">{v.word}</span>
          </span>
          <span className="t-small t-muted">{v.note}</span>
        </div>
      )}
      {final ? null : (
        <div className="gr-whatif">
          <label className="gr-line t-small t-muted" htmlFor="gr-slider">
            <span>If I average this on what's left</span>
            <span className="num t-text">{avg}%</span>
          </label>
          <input id="gr-slider" className="gr-slider" type="range" min="0" max="100" step="1" value={avg} onChange={(e) => setAvg(Number(e.target.value))} />
          <div className="gr-line">
            <span className="t-small t-muted">I finish with</span>
            <span className="gr-finish"><span className="num">{formatPct(projected)}%</span> <span className="gr-finish-letter">{letterFor(projected, scale)}</span></span>
          </div>
        </div>
      )}
      {remaining.length ? (
        <div className="gr-left">
          <span className="t-label t-faint">Still to come</span>
          <ul className="gr-left-list">
            {remaining.map((r) => (
              <li key={r.uuid}>
                <span>{r.title}</span>
                <span className="num t-muted">{formatPct(r.share)}% of grade</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export function GradesTab({ courseUuid }) {
  const { data, reload } = useCourseGrade(courseUuid);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState(null);
  const fileRef = useRef(null);

  const view = useMemo(() => {
    if (!data) return null;
    const g = computeCourseGrade(data);
    return { g, ...categoryStanding({ rows: g.rows, graded: data.graded, open: data.snapshot.assignments || [] }) };
  }, [data]);
  useEffect(() => {
    void courseStore.getSetting(SOURCE_KEY(courseUuid)).then(setSource);
  }, [courseUuid]);

  if (!view) return <div className="split"><div className="split-main"><Card><Skeleton height={64} /></Card><Card><Skeleton height={160} /></Card></div></div>;
  const { cats, st, remaining, pointsBased } = view;
  const scale = data.scale && Object.keys(data.scale).length ? data.scale : DEFAULT_SCALE;
  const current = st.current ?? view.g.current;

  const save = async (rows) => {
    const old = new Map(data.snapshot.components.map((c) => [c.uuid, c]));
    await courseStore.saveGradeComponents(
      courseUuid,
      rows.map((r) => ({ id: r.uuid, uuid: r.uuid, name: r.name.trim(), weight: Number(r.weight) / 100, category: old.get(r.uuid)?.category || "other" }))
    );
    await courseStore.applyBbGrades(courseUuid);
    await courseStore.setSetting(SOURCE_KEY(courseUuid), "manual");
    setSource("manual");
    setStatus("");
    await reload();
  };

  const upload = async (file) => {
    if (!file) return;
    setStatus("Reading the syllabus…");
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "doc", "docx"].includes(ext)) return setStatus("Choose a PDF or Word file.");
      const res = await window.studyHub?.extractFile?.({ name: file.name, bytes: await file.arrayBuffer() });
      const parsed = parseSyllabusGrading(res?.text || "");
      if (parsed.grading.length < 2) return setStatus("Could not find grade weights in that file. Type them in instead.");
      const byName = new Map(data.snapshot.components.map((r) => [r.name.toLowerCase(), r]));
      await courseStore.saveGradeComponents(
        courseUuid,
        parsed.grading.map((c) => {
          const id = byName.get(String(c.name).toLowerCase())?.uuid || c.uuid || crypto.randomUUID();
          return { id, uuid: id, name: c.name, weight: c.weight, category: c.category || "other" };
        })
      );
      if (parsed.gradingScale) await courseStore.saveGradingScale(courseUuid, parsed.gradingScale);
      await courseStore.applyBbGrades(courseUuid);
      await courseStore.setSetting(SOURCE_KEY(courseUuid), "syllabus");
      setSource("syllabus");
      setStatus(`Found ${parsed.grading.length} categories. Check them below.`);
      await reload();
    } catch {
      setStatus("Could not read that file. Try another one.");
    }
  };

  const weights = (
    <WeightsCard key={cats.map((c) => `${c.uuid}:${c.weight}`).join()} cats={cats} pointsBased={pointsBased} source={source} onSave={save} onUpload={() => fileRef.current?.click()} status={status} />
  );
  const privacy = (
    <p className="gr-privacy">
      <Icon name="lock" size={16} />
      Grades stay on this computer. They are never sent to Ask.
    </p>
  );
  const file = <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden aria-label="Syllabus file" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />;

  if (current == null || st.doneW <= 0) {
    return (
      <div className="split">
        <div className="split-main">
          <Card><h2 className="t-heading">No grades yet</h2><p className="t-small t-muted">Once something is graded, you will see where you stand and what you need.</p></Card>
          {weights}
          {privacy}
          {file}
        </div>
      </div>
    );
  }

  return (
    <div className="split">
      <div className="split-main">
        <StandCard current={current} letter={letterFor(current, scale)} st={st} remaining={remaining} />
        {weights}
        {privacy}
        {file}
      </div>
      <div className="split-side">
        <NeedCard key={courseUuid} st={st} scale={scale} current={current} remaining={remaining} onTarget={(min) => courseStore.setTargetGrade(courseUuid, min)} />
      </div>
    </div>
  );
}
