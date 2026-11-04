import { useCallback, useEffect, useState } from "react";
import { Button, Card, Skeleton, TextLink } from "../../components/ui/index.jsx";
import { plainDate } from "../../lib/dates.js";
import { courseStore } from "../../db/courseStore.js";

const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Announcement cards: title, date, body clamped to 3 lines with Read more. Opening one marks it read. */
export function AnnouncementsView({ courseUuid }) {
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const res = await courseStore.getAnnouncements(courseUuid);
    setRows(Array.isArray(res) ? res : []);
  }, [courseUuid]);

  useEffect(() => {
    void load();
    const onSynced = (e) => {
      if (e.detail?.courseUuid === courseUuid) void load();
    };
    window.addEventListener("studyhub-bb-synced", onSynced);
    return () => window.removeEventListener("studyhub-bb-synced", onSynced);
  }, [courseUuid, load]);

  const notify = () => window.dispatchEvent(new CustomEvent("studyhub-mirror-changed", { detail: { courseUuid } }));
  const markRead = async (a) => {
    await courseStore.markAnnouncementRead(a.uuid);
    setRows((list) => list.map((x) => (x.uuid === a.uuid ? { ...x, read: 1 } : x)));
    notify();
  };
  const markAllRead = async () => {
    for (const a of rows.filter((x) => !x.read)) await courseStore.markAnnouncementRead(a.uuid);
    setRows((list) => list.map((x) => ({ ...x, read: 1 })));
    notify();
  };

  if (rows === null) return <Card><Skeleton height={20} width="40%" radius={8} /><Skeleton height={60} /></Card>;
  if (!rows.length) return <Card><p className="t-muted">No announcements yet. They show up after the next sync.</p></Card>;
  const unread = rows.filter((a) => !a.read).length;

  return (
    <div className="stack">
      {unread ? (
        <div className="card-head">
          <span className="t-small t-muted">{unread} unread</span>
          <Button variant="outline-sm" size="sm" onClick={markAllRead}>Mark all read</Button>
        </div>
      ) : null}
      {rows.map((a) => {
        const open = openId === a.uuid;
        return (
          <Card key={a.uuid} as="article" className="ann">
            <div className="ann-head">
              <h2 className="ann-title">{a.title}</h2>
              {a.read ? null : <span className="ann-unread" aria-label="Unread" />}
              <span className="ann-date num">{plainDate(a.posted_at || a.created_at)}</span>
            </div>
            <p className={`ann-body${open ? "" : " clamp-3"}`}>{plain(a.body) || "No text."}</p>
            <TextLink
              aria-expanded={open}
              onClick={() => {
                setOpenId(open ? null : a.uuid);
                if (!a.read) void markRead(a);
              }}
            >
              {open ? "Show less" : "Read more"}
            </TextLink>
          </Card>
        );
      })}
    </div>
  );
}
