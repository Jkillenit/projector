import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fuzzyFilter } from "../lib/fuzzy.js";

function matchHighlightParts(primary, query) {
  const q = query.trim();
  if (!q) return { pre: primary, match: null, post: null };
  const lower = primary.toLowerCase();
  const qi = q.toLowerCase();
  const i = lower.indexOf(qi);
  if (i < 0) return { pre: primary, match: null, post: null };
  return {
    pre: primary.slice(0, i),
    match: primary.slice(i, i + q.length),
    post: primary.slice(i + q.length),
  };
}

function PrimaryLabel({ text, query }) {
  const { pre, match, post } = matchHighlightParts(text, query);
  if (!match) return <span className="sh-palette-row-primary">{text}</span>;
  return (
    <span className="sh-palette-row-primary">
      {pre}
      <span className="sh-palette-match">{match}</span>
      {post}
    </span>
  );
}

export function CommandPalette({ open, onClose, items }) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const prevFocusRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || "");
  const prefixChar = isMac ? "⌘" : "›";

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement;
      setMounted(true);
      setFadeIn(false);
      setQuery("");
      setHighlightedIndex(0);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setFadeIn(false);
    const t = window.setTimeout(() => {
      setMounted(false);
      setQuery("");
      try {
        const el = prevFocusRef.current;
        if (el && typeof el.focus === "function") el.focus();
      } catch {
        /* ignore */
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted || !fadeIn) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, mounted, fadeIn]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const rows = useMemo(() => {
    if (!mounted) return [];
    const q = query.trim();
    return (q ? fuzzyFilter(items, q, (r) => `${r.primary} ${r.sub || ""}`) : items).slice(0, 12);
  }, [mounted, items, query]);
  const indexRows = { groups: rows.length ? [{ key: "all", label: query.trim() ? "Results" : "Go to", rows }] : [], flat: rows };

  const flatRows = indexRows.flat;
  const totalNav = flatRows.length;

  useEffect(() => {
    setHighlightedIndex((i) => {
      const max = Math.max(0, flatRows.length - 1);
      return Math.min(i, max);
    });
  }, [flatRows.length]);

  const executeRow = useCallback(
    (row) => {
      if (!row) return;
      row.run();
      if (!row.keepOpen) onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (!totalNav) return;
        setHighlightedIndex((i) => (i + 1) % totalNav);
        return;
      }
      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        if (!totalNav) return;
        setHighlightedIndex((i) => (i - 1 + totalNav) % totalNav);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const row = flatRows[highlightedIndex];
        executeRow(row);
      }
    },
    [onClose, totalNav, flatRows, highlightedIndex, executeRow]
  );

  if (!mounted) return null;

  const emptySearch =
    query.trim().length > 0 &&
    indexRows.groups.length === 0;

  const fadeClass = fadeIn ? "sh-palette-fade-in" : "sh-palette-fade-out";

  return (
    <>
      <div
        className={`sh-palette-backdrop ${fadeClass}`}
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className={`sh-palette ${fadeClass}`}
        data-palette="true"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sh-palette-input-row">
          <span className="sh-palette-prefix mono" aria-hidden>
            {prefixChar}
          </span>
          <input
            ref={inputRef}
            type="search"
            className="sh-palette-input mono"
            placeholder="Search screens, courses, resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="sh-palette-esc-badge mono" aria-hidden>
            ESC
          </span>
        </div>
        <div className="sh-palette-results sh-scroll-hover">
          {emptySearch ? (
            <div className="sh-palette-empty mono">{`NO RESULTS FOR "${query.trim()}"`}</div>
          ) : (
            (() => {
              let navI = 0;
              return indexRows.groups.map((g) => (
                <div key={g.key}>
                  <div className="sh-palette-group-label">{g.label}</div>
                  {g.rows.map((row) => {
                    const globalIdx = navI++;
                    const hi = globalIdx === highlightedIndex;
                    return (
                      <div
                        key={row.key}
                        className={`sh-palette-row sh-palette-row--${row.group} ${hi ? "highlighted" : ""}`}
                        role="option"
                        aria-label={`${row.primary} ${row.sub || ""}`}
                        aria-selected={hi}
                        onMouseEnter={() => setHighlightedIndex(globalIdx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeRow(row)}
                      >
                        <span className="sh-palette-row-icon mono">{row.icon}</span>
                        <div className="sh-palette-row-center">
                          <PrimaryLabel text={row.primary} query={query} />
                          <div className="sh-palette-row-sub mono">{row.sub}</div>
                        </div>
                        {hi && row.shortcut ? <span className="kbd">{row.shortcut}</span> : null}
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>
      </div>
    </>
  );
}
