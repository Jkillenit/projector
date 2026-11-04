import { Icon } from "./Icon.jsx";

export { Icon };

const cx = (...parts) => parts.filter(Boolean).join(" ");

/**
 * One filled (`primary`) button per screen; everything else is `secondary`, `quiet` or `outline-sm`.
 * With `href` it renders a link; `external` opens in the browser and adds the ↗ arrow.
 */
export function Button({ variant = "secondary", size = "md", href, external, icon, trailing, className, children, ...rest }) {
  const cls = cx("ui-btn", `ui-btn--${variant}`, `ui-btn--${size}`, className);
  const body = (
    <>
      {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
      {children}
      {trailing}
      {external ? <Icon name="arrow-up-right" size={size === "sm" ? 13 : 14} /> : null}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {body}
    </button>
  );
}

/** Accent text link. `arrow` adds a trailing →. A button when there is no `href`. */
export function TextLink({ href, external, arrow, className, children, ...rest }) {
  const cls = cx("ui-link", className);
  const body = (
    <>
      {children}
      {arrow ? <span aria-hidden> →</span> : null}
      {external ? <Icon name="arrow-up-right" size={13} /> : null}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {body}
    </button>
  );
}

export function Card({ as: Tag = "section", className, children, ...rest }) {
  return (
    <Tag className={cx("ui-card", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Course color dot. Reads --course from a parent unless `color` is given. */
export function CourseDot({ size = 8, color }) {
  return <span className="ui-dot" style={{ width: size, height: size, ...(color ? { background: color } : {}) }} aria-hidden />;
}

/** Mono course code tag in the course's text color on its tint. Reads --course-text / --course-tint. */
export function CodeTag({ children, style }) {
  return (
    <span className="ui-code" style={style}>
      {children}
    </span>
  );
}

/** tone: accent | good | warn | neutral | support. `inline` is the slimmer task-meta size; `tiny` is 11px. */
export function Pill({ tone = "neutral", inline, tiny, children }) {
  return <span className={cx("ui-pill", `ui-pill--${tone}`, inline && "ui-pill--inline", tiny && "ui-pill--tiny")}>{children}</span>;
}

/** Suggestion or filter chip. Filters pass `pressed` and get the inverted selected look. */
export function Chip({ pressed, filter, className, children, ...rest }) {
  return (
    <button type="button" className={cx("ui-chip", filter && "ui-chip--filter", className)} aria-pressed={pressed === undefined ? undefined : !!pressed} {...rest}>
      {children}
    </button>
  );
}

/** Equal-width segmented control. `options`: [[value, label]]. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="ui-seg" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className="ui-seg-btn" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** `value` 0..100. Fill is the course color (--course). `dim` is the 0.7 opacity Home look. */
export function ProgressBar({ value, height = 4, dim, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="ui-bar" style={{ height, borderRadius: height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}>
      <span className="ui-bar-fill" style={{ width: `${v}%`, borderRadius: height, opacity: dim ? 0.7 : 1 }} />
    </span>
  );
}

/** Numbered steps with round number badges. `steps`: strings or nodes. */
export function StepList({ steps }) {
  return (
    <ol className="ui-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <span className="ui-step-num num" aria-hidden>
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Slim inline status banner (expired sign in and the like). One `action` button at most. */
export function Notice({ children, action, onAction }) {
  return (
    <div className="ui-notice" role="status">
      <Icon name="alert-triangle" size={18} className="ui-notice-icon" />
      <span className="ui-notice-text">{children}</span>
      {action ? (
        <button type="button" className="ui-notice-btn" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function VisuallyHidden({ children, ...rest }) {
  return (
    <span className="vh" {...rest}>
      {children}
    </span>
  );
}

/** Gray placeholder in the shape of real content. */
export function Skeleton({ height = 16, width = "100%", radius = 12 }) {
  return <span className="ui-skel" style={{ height, width, borderRadius: radius }} aria-hidden />;
}
