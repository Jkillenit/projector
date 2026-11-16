import { APP_MARK, APP_NAME } from "../constants/app.js";

// Drop the team logo at src/assets/logo.svg (or .png / .webp) and it replaces the AL tile everywhere.
const logos = import.meta.glob("../assets/logo.{svg,png,webp}", { eager: true, query: "?url", import: "default" });
const LOGO = Object.values(logos)[0];

/** The app mark. The name and the mark are the same word, so the mark doubles as the name for screen readers. */
export function Brand({ size = 32 }) {
  if (LOGO) return <img className="sb-logo" src={LOGO} alt={APP_NAME} width={size} height={size} />;
  return (
    <span className="sb-mark" role="img" aria-label={APP_NAME}>
      {APP_MARK}
    </span>
  );
}
