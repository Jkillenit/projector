import { routeHref } from "./useRoute.js";

/** The five phone tabs (under 900px). Everything else stays in the drawer. */
export const TABS = [
  { key: "home", label: "Home", icon: "home", href: routeHref("home") },
  { key: "calendar", label: "Calendar", icon: "calendar", href: routeHref("calendar") },
  { key: "ask", label: "Ask", icon: "ask", href: routeHref("ask") },
  { key: "campus", label: "Campus", icon: "book", href: routeHref("campus") },
  { key: "map", label: "Map", icon: "map", href: routeHref("map") },
];

const OWNER = { home: "home", calendar: "calendar", ask: "ask", campus: "campus", events: "campus", map: "map" };

/** Which tab a route belongs to, or null (course pages and settings live in the drawer). */
export const activeTab = (route) => OWNER[route.name] ?? null;
