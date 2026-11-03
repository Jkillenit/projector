import { useCallback, useEffect, useState } from "react";
import { plainDate } from "../../lib/dates.js";
import { courseStore } from "../../db/courseStore.js";

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

  const markRead = async (a) => {
    await courseStore.markAnnouncementRead(a.uuid);
    setRows((list) => list.map((x) => (x.uuid === a.uuid ? { ...x, read: 1 } : x)));
    window.dispatchEvent(new CustomEvent("studyhub-mirror-changed", { detail: { courseUuid } }));
  };

  const markAllRead = async () => {
    for (const a of rows.filter((x) => !x.read)) await courseStore.markAnnouncementRead(a.uuid);
    setRows((list) => list.map((x) => ({ ...x, read: 1 })));
    window.dispatchEvent(new CustomEvent("studyhub-mirror-changed", { detail: { courseUuid } }));
  };

  if (rows === null) return <div className="sh-skeleton-pulse" style={{ height: 200 }} />;
  const unread = rows.filter((a) => !a.read).length;

  return (
    <div className="fd-panel sh-mirror-view">
      <div className="sh-mirror-head">
        <h2 className="fd-h2">Announcements{unread ? ` · ${unread} unread` : ""}</h2>
        {unread ? (
          <button type="button" className="fd-btn-quiet" onClick={markAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>
      {!rows.length ? (
        <p className="sh-today-empty">No announcements yet. Sync this course from Blackboard to pull them in.</p>
      ) : (
        <ul className="sh-today-list">
          {rows.map((a) => {
            const open = openId === a.uuid;
            return (
              <li key={a.uuid} className="sh-ann-item">
                <button
                  type="button"
                  className="sh-today-row sh-today-row--button"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : a.uuid);
                    if (!a.read) void markRead(a);
                  }}
                >
                  <span className={`sh-today-dot${a.read ? "" : " sh-today-dot--unread"}`} />
                  <span className="sh-today-row-main">
                    <span className="sh-today-row-title">{a.title}</span>
                    <span className="sh-today-row-sub">{plainDate(a.posted_at || a.created_at)}</span>
                  </span>
                </button>
                {open ? <p className="sh-today-ann-body sh-ann-body-full">{a.body || "No text."}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
