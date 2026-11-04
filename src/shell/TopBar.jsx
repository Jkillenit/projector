import { useEffect, useRef } from "react";
import { APP_NAME } from "../constants/app.js";
import { Icon } from "../components/ui/index.jsx";
import { routeHref } from "./useRoute.js";

/** Under 900px the sidebar becomes this bar: brand, search and a menu that opens the sidebar as a drawer. */
export function TopBar({ onSearch, onMenu }) {
  return (
    <header className="topbar">
      <a className="sb-brand topbar-brand" href={routeHref("home")}>
        <span className="sb-mark" aria-hidden>P</span>
        <span className="sb-name">{APP_NAME}</span>
      </a>
      <button type="button" className="topbar-btn" aria-label="Search" onClick={onSearch}>
        <Icon name="search" size={18} />
      </button>
      <button type="button" className="topbar-btn" aria-label="Open menu" onClick={onMenu}>
        <Icon name="menu" size={18} />
      </button>
    </header>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Left drawer with a focus trap. Esc or the backdrop closes it, and focus goes back where it was. */
export function Drawer({ open, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    ref.current?.querySelector(FOCUSABLE)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return undefined;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return undefined;
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-wrap">
      <div className="drawer-scrim" onClick={onClose} aria-hidden />
      <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" className="sb-icon-btn drawer-close" aria-label="Close menu" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
