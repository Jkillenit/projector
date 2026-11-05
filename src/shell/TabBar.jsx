import { Icon } from "../components/ui/index.jsx";
import { TABS, activeTab } from "./tabs.js";

/** Bottom tabs on phones and small tablets. Hidden at 900px and up, where the sidebar shows. */
export function TabBar({ route }) {
  const on = activeTab(route);
  return (
    <nav className="tabbar" aria-label="Main tabs">
      {TABS.map((t) => (
        <a key={t.key} className="tabbar-item" href={t.href} aria-current={on === t.key ? "page" : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
