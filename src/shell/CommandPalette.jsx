import { useEffect, useMemo, useRef, useState } from "react";
import resources from "../demo/resources.json";
import organizations from "../demo/organizations.json";
import { Icon } from "../components/ui/index.jsx";
import { fuzzyFilter } from "../lib/fuzzy.js";
import { getCourseLabel } from "../features/dashboard/courseLabel.js";
import { categoryLabel, searchText } from "../features/resources/resourceView.js";

const PER_GROUP = 5;

/** Every searchable thing as { key, group, label, sub, text, run }. */
function buildItems({ courses, upcoming, paletteActions, actions }) {
  return [
    ...courses.map((c) => ({ key: `c-${c.id}`, group: "Courses", label: c.label, sub: c.hint, text: `${c.label} ${c.hint}`, run: () => actions.openCourse(c.id) })),
    ...upcoming.map((a) => {
      const code = getCourseLabel({ courseCode: a.course_code, name: a.course_name });
      return { key: `a-${a.uuid}`, group: "Assignments", label: a.title, sub: code, text: `${a.title} ${code}`, run: () => actions.openCourse(a.course_uuid, "assignments", a.uuid) };
    }),
    ...resources.map((r) => ({ key: `r-${r.id}`, group: "Resources", label: r.name, sub: categoryLabel(r), text: searchText(r), run: () => actions.openResource(r.id) })),
    ...organizations.map((o) => ({ key: `o-${o.id}`, group: "Clubs", label: o.name, sub: o.interests.join(", "), text: `${o.name} club ${o.interests.join(" ")}`, run: () => actions.navigate("campus", ["clubs"]) })),
    ...paletteActions.map((a) => ({ key: a.key, group: "Actions", label: a.label, sub: "", text: a.label, run: a.run })),
  ];
}

const GROUPS = ["Courses", "Assignments", "Resources", "Clubs", "Actions"];

/** Ctrl/⌘ K. Arrow keys move, Enter opens, Esc closes. Enter with no match asks the question instead. */
export function CommandPalette({ open, onClose, courses, upcoming, paletteActions, actions }) {
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    setQuery("");
    setHi(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => before?.focus?.();
  }, [open]);

  const all = useMemo(() => buildItems({ courses, upcoming, paletteActions, actions }), [courses, upcoming, paletteActions, actions]);
  const groups = useMemo(() => {
    const q = query.trim();
    const found = q ? fuzzyFilter(all, q, (i) => i.text) : all.filter((i) => i.group !== "Clubs" && i.group !== "Resources");
    return GROUPS.map((g) => ({ g, rows: found.filter((i) => i.group === g).slice(0, PER_GROUP) })).filter((x) => x.rows.length);
  }, [all, query]);
  const flat = groups.flatMap((x) => x.rows);
  useEffect(() => {
    setHi(0);
  }, [query]);

  if (!open) return null;
  const run = (item) => {
    onClose();
    item.run();
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[hi]) run(flat[hi]);
      else if (query.trim()) {
        onClose();
        actions.ask(query.trim());
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  let n = -1;
  return (
    <div className="pal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Search everything">
        <div className="pal-input-row">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            className="pal-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={flat[hi] ? `pal-${flat[hi].key}` : undefined}
            aria-label="Search everything"
            placeholder="Search courses, assignments, resources and clubs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="sb-kbd">Esc</kbd>
        </div>
        <div id="pal-list" className="pal-list" role="listbox" aria-label="Results">
          {flat.length ? (
            groups.map(({ g, rows }) => (
              <div key={g} role="group" aria-label={g}>
                <div className="pal-group">{g}</div>
                {rows.map((item) => {
                  n += 1;
                  const i = n;
                  return (
                    <div
                      key={item.key}
                      id={`pal-${item.key}`}
                      role="option"
                      aria-selected={i === hi}
                      className="pal-row"
                      onMouseEnter={() => setHi(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(item)}
                    >
                      <span className="pal-label">{item.label}</span>
                      {item.sub ? <span className="pal-sub">{item.sub}</span> : null}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <p className="pal-empty">No match. Press Enter to ask "{query.trim()}".</p>
          )}
        </div>
      </div>
    </div>
  );
}
