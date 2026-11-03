/**
 * One course's grade for the course page: syllabus weights when there are any, else Blackboard's
 * overall column, else points earned over points possible. Pure; no grades leave the computer.
 */
import { BASIS, fallbackGrade } from "./gradesView.js";
import { currentGrade, hasScore, letterFor, normalized } from "./gradeMath.js";
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
