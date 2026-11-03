import { useMemo, useRef, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { parseSyllabusGrading } from "../import/syllabusImport.js";
import { plainDue } from "../../lib/dates.js";
import { formatPct } from "../today/priority.js";
import { computeCourseGrade } from "./courseGrade.js";
import { gradeTone, totalWeight } from "./gradeMath.js";
import { useCourseGrade } from "./useCourseGrade.js";

const DEFAULT_TARGETS = { A: 90, B: 80, C: 70, D: 60 };
const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const pctText = (n) => (n == null ? "—" : `${formatPct(n)}%`);
const toSave = (rows) => rows.map((r) => ({ id: r.id, uuid: r.uuid, name: r.name, weight: r.weight, category: r.category }));

function NeedLine({ label, entry, letter }) {
  if (!entry) return null;
  const needed = entry.needed;
  const text =
    needed == null ? "Not enough to tell yet"
    : needed > 100 ? `Even 100% won't reach ${letter}`
    : needed <= 0 ? `Already there for ${letter}`
    : <>Need <span className="fd-num">{formatPct(needed)}%</span> for {letter}</>;
  return (
    <li>
      <span className="fd-row-main">
        <strong>{entry.title}</strong>
        <span className="fd-meta">{label}{entry.dueDate ? ` · ${plainDue(entry.dueDate)}` : ""}</span>
      </span>
      <span>{text}</span>
    </li>
  );
}

function ComponentBlock({ row, open, whatIf, setWhatIf, drop, setDrop, onEdit, onDelete, onManual }) {
  const hypos = new Map(row.items.filter((i) => i.hypo).map((i) => [i.id, i]));
  return (
    <li className="fd-gr-comp">
      <div className="fd-gr-comp-head">
        <input className="fd-input fd-gr-name" aria-label="Category name" defaultValue={row.name} onBlur={(e) => e.target.value.trim() && e.target.value !== row.name && onEdit(row, { name: e.target.value.trim() })} />
        <label className="fd-gr-field">
          <input className="fd-input fd-num" type="number" min="0" max="100" aria-label={`${row.name} weight percent`} defaultValue={Math.round(row.weight * 1000) / 10} onBlur={(e) => { const w = num(e.target.value); if (w != null && w >= 0 && w <= 100 && w / 100 !== row.weight) onEdit(row, { weight: w / 100 }); }} />
          <span className="fd-meta">% of grade</span>
        </label>
        <strong className={`fd-num fd-tone-${gradeTone(row.score)}`}>{pctText(row.score)}</strong>
        <button type="button" className="fd-link" onClick={() => onDelete(row)} aria-label={`Remove ${row.name}`}>Remove</button>
      </div>
      {row.manual ? (
        <label className="fd-gr-field">
          <span className="fd-meta">Your score</span>
          <input className="fd-input fd-num" type="number" min="0" max="100" placeholder="%" aria-label={`${row.name} score percent`} defaultValue={row.score ?? ""} onBlur={(e) => onManual(row, num(e.target.value))} />
        </label>
      ) : null}
      {row.items.length > 1 ? (
        <label className="fd-gr-field">
          <span className="fd-meta">Drop lowest</span>
          <input className="fd-input fd-num fd-gr-small" type="number" min="0" max={row.items.length - 1} aria-label={`${row.name} dropped scores`} value={drop || 0} onChange={(e) => setDrop(row.uuid, Math.max(0, Math.round(num(e.target.value) || 0)))} />
        </label>
      ) : null}
      <ul className="fd-gr-items">
        {row.items.filter((i) => !i.hypo).map((i) => (
          <li key={i.id} className={row.dropped.has(i.id) ? "is-dropped" : ""}>
            <span>{i.name}</span>
            <span className="fd-num">{i.earned}/{i.possible}{row.dropped.has(i.id) ? " · dropped" : ""}</span>
          </li>
        ))}
        {open.map((a) => (
          <li key={a.uuid} className={hypos.has(a.uuid) ? "is-hypo" : ""}>
            <span>{a.title}<span className="fd-meta"> · {a.dueDate ? plainDue(a.dueDate) : "no date"}</span></span>
            <label className="fd-gr-field">
              <input className="fd-input fd-num fd-gr-small" type="number" min="0" placeholder="What if" aria-label={`What if score on ${a.title}`} value={whatIf[a.uuid] ?? ""} onChange={(e) => setWhatIf((w) => { const { [a.uuid]: _, ...rest } = w; const v = num(e.target.value); return v == null ? rest : { ...rest, [a.uuid]: v }; })} />
              <span className="fd-meta">/ {a.pointsPossible || 100}</span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function GradesTab({ courseUuid }) {
  const { data, reload, setDrops } = useCourseGrade(courseUuid);
  const [whatIf, setWhatIf] = useState({});
  const [status, setStatus] = useState("");
  const fileRef = useRef(null);

  const g = useMemo(() => (data ? computeCourseGrade({ ...data, whatIf }) : null), [data, whatIf]);
  if (!g) return <div className="sh-skeleton-pulse" style={{ height: 200 }} />;
  const { snapshot, scale, drops } = data;

  const save = async (rows, note) => {
    await courseStore.saveGradeComponents(courseUuid, toSave(rows));
    await courseStore.applyBbGrades(courseUuid);
    if (note) setStatus(note);
    await reload();
  };
  const bare = snapshot.components.map(({ uuid, name, weight, category }) => ({ id: uuid, uuid, name, weight, category }));
  const edit = (row, patch) => save(bare.map((r) => (r.uuid === row.uuid ? { ...r, ...patch } : r)));
  const remove = (row) => save(bare.filter((r) => r.uuid !== row.uuid));
  const add = () => { const id = crypto.randomUUID(); return save([...bare, { id, uuid: id, name: "New category", weight: 0.1, category: "other" }]); };
  const setManual = async (row, score) => {
    const stored = (await courseStore.getGradeComponents(courseUuid)).find((r) => r.uuid === row.uuid);
    await courseStore.upsertGradeEntry({ courseUuid, componentId: stored?.id ?? row.uuid, score });
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
      if (parsed.grading.length < 2) return setStatus("Could not find grade weights in that file. Add them by hand below.");
      if (bare.length && !window.confirm(`Replace ${bare.length} categories with ${parsed.grading.length} from this file?`)) return setStatus("");
      const byName = new Map(bare.map((r) => [r.name.toLowerCase(), r]));
      await save(
        parsed.grading.map((c) => {
          const old = byName.get(String(c.name).toLowerCase());
          const id = old?.uuid || c.uuid || crypto.randomUUID();
          return { id: old?.id ?? id, uuid: id, name: c.name, weight: c.weight, category: c.category || "other" };
        })
      );
      if (parsed.gradingScale) await courseStore.saveGradingScale(courseUuid, parsed.gradingScale);
      setStatus(`Found ${parsed.grading.length} categories. Check the weights below.`);
      await reload();
    } catch {
      setStatus("Could not read that file. Try another one.");
    }
  };

  const targets = Object.entries(scale && Object.keys(scale).length ? scale : DEFAULT_TARGETS).filter(([l]) => l !== "F").sort((a, b) => b[1] - a[1]);
  const targetLetter = targets.find(([, min]) => min === g.target)?.[0] || `${g.target}%`;
  const weightSum = totalWeight(g.rows);
  const openFor = (uuid) => (snapshot.assignments || []).filter((a) => a.componentUuid === uuid && a.score == null);
  const hasWhatIf = Object.keys(whatIf).length > 0;

  return (
    <div className="fd-gr">
      <section className="fd-panel fd-gr-top" aria-label="Current grade">
        <div>
          <span className={`fd-gr-big fd-num fd-tone-${gradeTone(g.current)}`}>{pctText(g.current)}</span>
          {g.letter ? <span className="fd-gr-letter">{g.letter}</span> : null}
          <p className="fd-meta">{g.basis ? `Based on: ${g.basis}` : "No grades in yet."}{hasWhatIf ? " · includes your what-if scores" : ""}</p>
        </div>
        <div className="fd-gr-target" role="group" aria-label="Target grade">
          <span className="fd-meta">I want a</span>
          {targets.map(([letter, min]) => (
            <button key={letter} type="button" className={`fd-chip${g.target === min ? " is-on" : ""}`} aria-pressed={g.target === min} onClick={() => courseStore.setTargetGrade(courseUuid, min)}>{letter}</button>
          ))}
        </div>
      </section>

      {g.needs && (g.needs.next || g.needs.final) ? (
        <section className="fd-panel" aria-label="Score needed">
          <h2 className="fd-h2">To get a {targetLetter}</h2>
          <ul className="fd-rows">
            <NeedLine label="Next big item" entry={g.needs.next && g.needs.next.uuid !== g.needs.final?.uuid ? g.needs.next : null} letter={targetLetter} />
            <NeedLine label="Final" entry={g.needs.final} letter={targetLetter} />
          </ul>
        </section>
      ) : null}

      <section className="fd-panel" aria-label="Grade weights">
        <div className="fd-gr-bar">
          <h2 className="fd-h2">Grade weights</h2>
          <div className="fd-gr-actions">
            {hasWhatIf ? <button type="button" className="fd-btn-quiet" onClick={() => setWhatIf({})}>Clear what-ifs</button> : null}
            <button type="button" className="fd-btn-quiet" onClick={add}>Add category</button>
            <button type="button" className="fd-btn-quiet" onClick={() => fileRef.current?.click()}>Upload syllabus</button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden aria-label="Syllabus file" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        {status ? <p className="fd-meta" role="status">{status}</p> : null}
        {g.hasWeights ? (
          <>
            <ul className="fd-gr-comps">
              {g.rows.map((r) => (
                <ComponentBlock key={`${r.uuid}:${r.name}:${r.weight}`} row={r} open={openFor(r.uuid)} whatIf={whatIf} setWhatIf={setWhatIf} drop={drops[r.uuid]} setDrop={(id, n) => setDrops({ ...drops, [id]: n })} onEdit={edit} onDelete={remove} onManual={setManual} />
              ))}
            </ul>
            <p className={`fd-meta${Math.abs(weightSum - 1) > 0.01 ? " fd-warn" : ""}`}>
              Weights add up to {Math.round(weightSum * 1000) / 10}%.{Math.abs(weightSum - 1) > 0.01 ? " They should be 100%. Fix them above if the syllabus was read wrong." : ""}
            </p>
          </>
        ) : (
          <p className="fd-meta">No syllabus weights yet. Upload the syllabus (PDF or Word) or add categories by hand. Until then this grade comes from {g.basis ? g.basis.toLowerCase() : "Blackboard once grades are in"}.</p>
        )}
      </section>
    </div>
  );
}
