import { useCallback, useEffect, useState } from "react";

/**
 * "#/course/abc/grades?item=x" → { name: "course", parts: ["abc", "grades"], query: { item: "x" } }.
 * Empty or unknown hashes are Home.
 */
export function parseRoute(hash) {
  const [path, qs = ""] = String(hash || "").replace(/^#\/?/, "").split("?");
  const [name, ...parts] = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { name: name || "home", parts, query: Object.fromEntries(new URLSearchParams(qs)) };
}

/** "course", ["abc", "grades"], { item: "x" } → "#/course/abc/grades?item=x" */
export function routeHref(name, parts = [], query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== "")).toString();
  return `#/${[name, ...parts].map(encodeURIComponent).join("/")}${qs ? `?${qs}` : ""}`;
}

/** Hash routing: works the same in the browser demo (GitHub Pages) and in Electron's file:// page. */
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const navigate = useCallback((name, parts, query) => {
    window.location.hash = routeHref(name, parts, query);
  }, []);
  return [route, navigate];
}
