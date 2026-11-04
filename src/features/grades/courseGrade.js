/**
 * One course's grade for the course page: syllabus weights when there are any, else Blackboard's
 * overall column, else points earned over points possible. Pure; no grades leave the computer.
 */
import { BASIS, fallbackGrade } from "./gradesView.js";
import { currentGrade, gradedShare, hasScore, letterFor, normalized, standing, totalWeight } from "./gradeMath.js";
import { neededScores } from "../today/priority.js";

const pct = (earned, possible) => (possible > 0 ? (earned / possible) * 100 : null);

/**
 * Items for one component: graded Blackboard items plus typed what-if scores on its open work.
 * `whatIf` is { [assignmentUuid]: points earned }. The lowest `drop` items by percent are left out.
 */
function itemsFor(comp, graded, open, whatIf) {
  const real = graded
    .filter((i) => !i.excluded && i.componentUuid === comp.uuid && i.score != null && Number(i.points_possible) > 0)
    .map((i) => ({ id: i.bb_id, name: i.name, earned: Number(i.score), possible: Number(i.points_possible), hypo: false }));
  const hypo = open
    .filter((a) => a.componentUuid === comp.uuid && whatIf[a.uuid] != null && Number.isFinite(Number(whatIf[a.uuid])))
    .map((a) => ({ id: a.uuid, name: a.title, earned: Number(whatIf[a.uuid]), possible: Number(a.pointsPossible) > 0 ? Number(a.pointsPossible) : 100, hypo: true }));
  return [...real, ...hypo];
}

/**
 * @param {object} p
 * @param {object} p.snapshot  one course from the Today snapshot ({ components, assignments, targetGrade })
 * @param {Array} p.graded     Blackboard grade items ({ bb_id, name, score, points_possible, componentUuid, excluded })
 * @param {object|null} p.overall  Blackboard overall column ({ score, possible })
 * @param {object|null} p.scale    { letter: minPercent }
 * @param {object} p.drops     { [componentUuid]: number of lowest items to drop }
 * @param {object} p.whatIf    { [assignmentUuid]: points earned }
 * @param {number} p.target    target percent
 */
export function computeCourseGrade({ snapshot, graded = [], overall = null, scale = null, drops = {}, whatIf = {}, target, now }) {
  const open = snapshot?.assignments || [];
  const rows = (snapshot?.components || []).map((c) => {
    const items = itemsFor(c, graded, open, whatIf);
    const n = Math.max(0, Math.min(Number(drops[c.uuid]) || 0, items.length - 1));
    const sorted = [...items].sort((a, b) => a.earned / a.possible - b.earned / b.possible);
    const dropped = new Set(sorted.slice(0, n).map((i) => i.id));
    const kept = items.filter((i) => !dropped.has(i.id));
    const score = kept.length
      ? pct(kept.reduce((s, i) => s + i.earned, 0), kept.reduce((s, i) => s + i.possible, 0))
      : hasScore(c) && !items.length ? Number(c.score) : null;
    return { ...c, score, items, dropped, manual: !items.length };
  });

  const weightedNow = currentGrade(normalized(rows));
  const fallback = weightedNow == null ? fallbackGrade(graded, overall) : null;
  const current = weightedNow ?? fallback?.current ?? null;
  const basis = current == null ? null : fallback?.basis || BASIS.weights;

  const tgt = target ?? snapshot?.targetGrade ?? 80;
  const needs = weightedNow == null
    ? null
    : neededScores(
        {
          ...snapshot,
          targetGrade: tgt,
          components: rows.map((r) => ({ ...r, pointsTotal: r.items.reduce((s, i) => s + i.possible, 0) || r.pointsTotal, itemCount: r.items.length || r.itemCount })),
          assignments: open.filter((a) => whatIf[a.uuid] == null),
        },
        { now }
      );
  return { rows, current, letter: letterFor(current, scale), basis, hasWeights: rows.length > 0, needs, target: tgt };
}

const pts = (a) => Number(a.pointsPossible ?? a.points_possible) || 0;

/**
 * Category rows for "Where you stand" and the Grade weights table, from computeCourseGrade's `rows`,
 * the Blackboard grade items and the course's open work. With no weights it falls back to points.
 * Returns { cats, st, remaining, pointsBased }: `cats` [{ uuid, name, weight, done, score, gradedText }],
 * `st` from standing(), `remaining` [{ uuid, title, share }] biggest first. Pure.
 */
export function categoryStanding({ rows = [], graded = [], open = [] }) {
  const todo = open.filter((a) => a.score == null);
  const total = totalWeight(rows);
  let cats;
  let remaining = [];
  if (total > 0) {
    cats = rows.map((r) => {
      const weight = (Number(r.weight) / total) * 100;
      const real = (r.items || []).filter((i) => !i.hypo);
      const here = todo.filter((a) => a.componentUuid === r.uuid);
      const gp = real.reduce((s, i) => s + i.possible, 0);
      const allPts = here.every((a) => pts(a) > 0);
      const totalPossible = allPts ? gp + here.reduce((s, a) => s + pts(a), 0) : 0;
      const count = real.length + here.length;
      const share = !count && r.score != null ? 1 : gradedShare({ gradedPossible: gp, totalPossible, gradedCount: real.length, totalCount: count });
      remaining = remaining.concat(here.map((a) => ({ uuid: a.uuid, title: a.title, share: weight * (totalPossible ? pts(a) / totalPossible : 1 / count) })));
      return { uuid: r.uuid, name: r.name, weight, done: weight * share, score: r.score, gradedText: !count ? (r.score != null ? "All" : "None yet") : here.length ? `${real.length} of ${count}` : "All" };
    });
  } else {
    const real = graded.filter((i) => !i.excluded && i.score != null && Number(i.points_possible) > 0);
    const gp = real.reduce((s, i) => s + Number(i.points_possible), 0);
    const tp = gp + todo.reduce((s, a) => s + pts(a), 0);
    const earned = real.reduce((s, i) => s + Number(i.score), 0);
    cats = [{ uuid: "points", name: "All graded work", weight: 100, done: tp ? (100 * gp) / tp : 0, score: gp ? (100 * earned) / gp : null, gradedText: todo.length ? `${real.length} of ${real.length + todo.length}` : "All" }];
    remaining = todo.map((a) => ({ uuid: a.uuid, title: a.title, share: tp ? (100 * pts(a)) / tp : 0 }));
  }
  remaining.sort((a, b) => b.share - a.share);
  return { cats, st: standing(cats), remaining, pointsBased: !(total > 0) };
}
