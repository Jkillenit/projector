import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Pill, ProgressBar, Skeleton } from "../../components/ui/index.jsx";
import { courseStore } from "../../db/courseStore.js";
import { uid } from "../../hub/userCourseModel.js";
import { RATINGS, previewIntervals } from "../../lib/sm2.js";
import { afterReview, cardFields, dueText, reviewQueue } from "./studyDeck.js";

/** Front and back inputs. Used to add a card and to edit one. */
function CardForm({ initial, onSave, onCancel, saveLabel }) {
  const [front, setFront] = useState(initial?.front || "");
  const [back, setBack] = useState(initial?.back || "");
  const fields = cardFields(front, back);
  const submit = async (e) => {
    e.preventDefault();
    if (!fields) return;
    await onSave(fields);
    if (!initial) {
      setFront("");
      setBack("");
    }
  };
  return (
    <form className="study-form" onSubmit={submit}>
      <label className="t-small t-muted" htmlFor={`${initial?.uuid || "new"}-front`}>Front (the question)</label>
      <textarea id={`${initial?.uuid || "new"}-front`} className="ui-input" value={front} onChange={(e) => setFront(e.target.value)} rows={2} />
      <label className="t-small t-muted" htmlFor={`${initial?.uuid || "new"}-back`}>Back (the answer)</label>
      <textarea id={`${initial?.uuid || "new"}-back`} className="ui-input" value={back} onChange={(e) => setBack(e.target.value)} rows={2} />
      <div className="ui-chips">
        <Button type="submit" variant="primary" size="sm" disabled={!fields}>{saveLabel}</Button>
        {onCancel ? <Button type="button" variant="quiet" size="sm" onClick={onCancel}>Cancel</Button> : null}
      </div>
    </form>
  );
}

/** One pass through the due cards: front, then the answer, then a rating that schedules the next review. */
function Review({ queue, onRate, onDone }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const card = queue[index];
  const ratings = useMemo(() => (card ? previewIntervals(card) : []), [card]);

  const rate = useCallback(
    async (grade) => {
      await onRate(card, grade);
      setShown(false);
      setIndex((i) => i + 1);
    },
    [card, onRate]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown) {
        const r = RATINGS.find((x) => x.key === e.key);
        if (r) rate(r.grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, rate]);

  if (!card) {
    return (
      <Card className="study-review" aria-live="polite">
        <h3 className="t-title">Done for today</h3>
        <p className="t-muted">You reviewed {queue.length} {queue.length === 1 ? "card" : "cards"}. They will come back when it is time.</p>
        <Button variant="primary" onClick={onDone}>Back to the deck</Button>
      </Card>
    );
  }
  return (
    <Card className="study-review" aria-live="polite">
      <div className="study-review-top">
        <span className="t-small t-faint">{index + 1} of {queue.length}</span>
        <Button variant="quiet" size="sm" onClick={onDone}>Stop</Button>
      </div>
      <ProgressBar value={(index / queue.length) * 100} label="Review progress" />
      <p className="study-side">{card.front}</p>
      {shown ? (
        <>
          <hr className="study-rule" />
          <p className="study-side">{card.back}</p>
          <p className="t-small t-muted">How well did you know it?</p>
          <div className="study-rate">
            {/* previewIntervals keeps RATINGS order but swaps each label for its interval ("6 days"). */}
            {ratings.map((r, i) => (
              <Button key={r.id} variant={r.id === "good" ? "primary" : "secondary"} onClick={() => rate(r.grade)} aria-keyshortcuts={r.key}>
                {RATINGS[i].label} · {r.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <Button variant="primary" size="lg" className="ui-btn--block" onClick={() => setShown(true)}>Show answer</Button>
      )}
    </Card>
  );
}

/** A course's flashcards: add, edit and delete them, and review the due ones with SM-2. */
export function StudyTab({ courseUuid }) {
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => setCards(await courseStore.getFlashcards(courseUuid)), [courseUuid]);
  useEffect(() => {
    load();
  }, [load]);

  const due = useMemo(() => reviewQueue(cards || []), [cards]);

  const saveCard = async (uuid, fields) => {
    const res = await courseStore.saveFlashcard({ courseUuid, uuid, ...fields });
    setError(res.success ? "" : res.error || "Could not save the card.");
    if (res.success) {
      setEditing(null);
      await load();
    }
  };
  const removeCard = async (card) => {
    if (!window.confirm(`Delete "${card.front}"? Its review history goes too.`)) return;
    await courseStore.deleteFlashcard(card.uuid);
    await load();
  };
  const rate = async (card, grade) => {
    const { card: next, mastery } = afterReview(card, grade);
    await courseStore.saveReview(mastery);
    setCards((list) => list.map((c) => (c.uuid === card.uuid ? next : c)));
  };

  if (!cards) return <Skeleton height={160} />;
  if (queue) return <Review queue={queue} onRate={rate} onDone={() => setQueue(null)} />;

  return (
    <div className="study">
      <Card className="study-head">
        <div>
          <h2 className="t-title">{dueText(due.length)}</h2>
          <p className="t-small t-muted">{cards.length} {cards.length === 1 ? "card" : "cards"} in this course. Cards come back on a schedule, sooner when you miss them.</p>
        </div>
        <Button variant="primary" disabled={!due.length} onClick={() => setQueue(due)}>Review due cards</Button>
      </Card>

      <Card>
        <h3 className="t-heading">Add a card</h3>
        <CardForm saveLabel="Add card" onSave={(fields) => saveCard(uid("fc"), fields)} />
        {error ? <p className="t-small" role="alert">{error}</p> : null}
      </Card>

      {cards.length ? (
        <Card>
          <h3 className="t-heading">Your cards</h3>
          <ul className="study-list">
            {cards.map((c) => (
              <li key={c.uuid}>
                {editing === c.uuid ? (
                  <CardForm initial={c} saveLabel="Save" onSave={(fields) => saveCard(c.uuid, fields)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="study-list-text">
                      <span>{c.front}</span>
                      <span className="t-small t-muted">{c.back}</span>
                    </div>
                    <div className="ui-chips">
                      {due.includes(c) ? <Pill tone="warn" tiny>Due</Pill> : null}
                      <Button variant="quiet" size="sm" onClick={() => setEditing(c.uuid)}>Edit</Button>
                      <Button variant="quiet" size="sm" onClick={() => removeCard(c)}>Delete</Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="t-small t-muted">No cards yet. Add one above: a term on the front, what it means on the back.</p>
      )}
    </div>
  );
}
