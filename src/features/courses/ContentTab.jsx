import { useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { openInBlackboard } from "../mirror/openInBlackboard.js";

/** The course's Blackboard content outline: folders and the items inside them. Open one in Blackboard. */
export function ContentTab({ courseUuid }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => courseStore.getBbItems(courseUuid).then((r) => alive && setItems(Array.isArray(r) ? r : []));
    void load();
    window.addEventListener("studyhub-bb-synced", load);
    return () => { alive = false; window.removeEventListener("studyhub-bb-synced", load); };
  }, [courseUuid]);
  if (!items) return <div className="sh-skeleton-pulse" style={{ height: 200 }} />;
  if (!items.length) return <p className="fd-meta">No course content yet. It shows here after the next sync.</p>;
  const ids = new Set(items.map((i) => i.bb_id));
  const depth = (i) => { let d = 0; for (let p = i.parent_bb_id; p && ids.has(p) && d < 6; d += 1) p = items.find((x) => x.bb_id === p)?.parent_bb_id; return d; };
  return (
    <section className="fd-panel" aria-label="Course content">
      <ul className="fd-rows">
        {items.map((i) => (
          <li key={i.bb_id} style={{ paddingLeft: depth(i) * 16 }}>
            <span className="fd-row-main">
              <strong>{i.title}</strong>
              {i.kind && i.kind !== "item" ? <span className="fd-meta">{i.kind}</span> : null}
            </span>
            {i.url ? <button type="button" className="fd-link" onClick={() => openInBlackboard(i.url)}>Open</button> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
