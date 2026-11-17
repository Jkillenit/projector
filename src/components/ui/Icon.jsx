// AL's own icon set: a 20 unit grid, 1.5 stroke, square ends and sharp joins.
const PATHS = {
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 17 17" />
    </>
  ),
  home: <path d="M3 9 10 3.5 17 9M5 7.5v9h10v-9M8.5 16.5V12h3v4.5" />,
  calendar: <path d="M3 4.5h14V17H3zM3 8.5h14M7 2.5V6M13 2.5V6" />,
  ask: <path d="M3 4h14v9.5H8l-3.5 3v-3H3z" />,
  book: <path d="M10 5.5C8.5 4.3 6 4 3 4.5v11c3-.5 5.5-.2 7 1 1.5-1.2 4-1.5 7-1v-11c-3-.5-5.5-.2-7 1zM10 5.5v11" />,
  map: <path d="M2.5 5 7.5 3l5 2 5-2v12l-5 2-5-2-5 2zM7.5 3v12M12.5 5v12" />,
  ticket: <path d="M3 5.5h14v3a1.5 1.5 0 0 0 0 3v3H3v-3a1.5 1.5 0 0 0 0-3zM12.5 5.5v1.5M12.5 9.25v1.5M12.5 13v1.5" />,
  users: (
    <>
      <circle cx="7.5" cy="7" r="2.75" />
      <path d="M2.5 16.5c0-3 2-4.5 5-4.5s5 1.5 5 4.5M12.5 4.4a2.75 2.75 0 0 1 0 5.2M14.5 12.3c1.8.5 3 1.9 3 4.2" />
    </>
  ),
  settings: (
    <>
      <path d="M3 6h6M13 6h4M3 14h2M9 14h8" />
      <circle cx="11" cy="6" r="2" />
      <circle cx="7" cy="14" r="2" />
    </>
  ),
  "chevron-right": <path d="M8 5l5 5-5 5" />,
  "chevron-down": <path d="M5 8l5 5 5-5" />,
  "arrow-up-right": <path d="M6.5 13.5l7-7M7.5 6.5h6v6" />,
  lock: <path d="M4 9h12v8H4zM6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />,
  eye: (
    <>
      <path d="M2 10c2-3.5 4.8-5.2 8-5.2s6 1.7 8 5.2c-2 3.5-4.8 5.2-8 5.2S4 13.5 2 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </>
  ),
  "alert-triangle": <path d="M10 3l8 13.5H2zM10 8v3.5M10 13.25v1.25" />,
  columns: <path d="M3 3h14v14H3zM10 3v14" />,
  menu: <path d="M3 5.5h14M3 10h14M3 14.5h14" />,
  x: <path d="M5 5l10 10M15 5 5 15" />,
  file: <path d="M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15" />,
  folder: <path d="M2.5 5H8l1.5 1.5h8v9h-15z" />,
  "win-min": <path d="M5 10h10" />,
  "win-max": <path d="M5 5h10v10H5z" />,
  "win-restore": <path d="M5 7.5h7.5V15H5zM7.5 7.5V5H15v7.5h-2.5" />,
};

/** Inline stroke icon. Decorative unless `label` is given. */
export function Icon({ name, size = 16, label, className, strokeWidth = 1.5 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
