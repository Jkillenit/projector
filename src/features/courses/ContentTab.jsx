import { useEffect, useState } from "react";
import { Card, Icon, Skeleton, TextLink } from "../../components/ui/index.jsx";
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
    return () => {
      alive = false;
      window.removeEventListener("studyhub-bb-synced", load);
    };
  }, [courseUuid]);
  if (!items) return <Card><Skeleton height={40} /><Skeleton height={40} /></Card>;
  if (!items.length) return <Card><p className="t-muted">No course content yet. It shows up after the next sync.</p></Card>;
  const ids = new Set(items.map((i) => i.bb_id));
  const depth = (i) => {
    let d = 0;
    for (let p = i.parent_bb_id; p && ids.has(p) && d < 6; d += 1) p = items.find((x) => x.bb_id === p)?.parent_bb_id;
    return d;
  };
  return (
    <Card className="content-tree" aria-label="Course content">
      <ul className="tree">
        {items.map((i) => (
          <li key={i.bb_id} className="tree-row" style={{ paddingLeft: 12 + depth(i) * 24 }}>
            <Icon name={i.kind === "folder" ? "folder" : "file"} size={16} className="t-faint" />
            <span className="tree-title">{i.title}</span>
            <TextLink external onClick={() => openInBlackboard(i.url)}>Open in Blackboard</TextLink>
          </li>
        ))}
      </ul>
    </Card>
  );
}
