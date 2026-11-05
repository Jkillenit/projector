import { useState } from "react";
import { Button, Card, Chip, CodeTag, CourseDot, Icon, Notice, Pill, ProgressBar, Segmented, Skeleton, StepList, TextLink } from "../../components/ui/index.jsx";
import { ICON_NAMES } from "../../components/ui/Icon.jsx";
import { courseStyle, getCourseColor } from "../dashboard/courseColor.js";

const Row = ({ children }) => <div className="dev-row">{children}</div>;

/** Hidden page at #/dev/ui: every shared component in every variant, for the team to check. */
export function UiGallery() {
  const [seg, setSeg] = useState("B");
  const [chip, setChip] = useState("all");
  return (
    <div className="page ui-fade">
      <h1 className="t-display">Components</h1>
      <Card>
        <h2 className="t-heading">Bento Campus tokens</h2>
        <Row>
          <span className="dev-token"><span className="dev-token-chip" style={{ background: "var(--accent)" }} />accent</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ background: "var(--new)" }} />new</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ background: "var(--good)" }} />good</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ background: "var(--warn)" }} />warn</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ background: "var(--support)" }} />support</span>
        </Row>
        <Row>
          <span className="dev-token"><span className="dev-token-chip" style={{ borderRadius: "var(--r-sm)" }} />r-sm</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ borderRadius: "var(--r-md)" }} />r-md</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ borderRadius: "var(--r-lg)" }} />r-lg</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ boxShadow: "var(--shadow-1)" }} />shadow-1</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ boxShadow: "var(--shadow-2)" }} />shadow-2</span>
          <span className="dev-token"><span className="dev-token-chip" style={{ boxShadow: "var(--shadow-3)" }} />shadow-3</span>
        </Row>
        <p className="t-display">Display 32</p>
        <p className="t-title">Title 22</p>
        <p className="t-heading">Heading 18</p>
        <p>Body 16. Atkinson Hyperlegible Next, with numbers in <span className="num">Geist Mono 0123</span>.</p>
        <p className="t-small t-muted">Small 14, muted</p>
        <p className="t-label t-faint">Label 13, faint</p>
      </Card>
      <Card>
        <h2 className="t-heading">Buttons</h2>
        <Row>
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="outline-sm" size="sm" icon="eye">Outline small</Button>
          <Button variant="primary" size="lg" external href="https://ualearn.blackboard.com">Large external</Button>
          <TextLink arrow>Text link</TextLink>
        </Row>
      </Card>
      <Card>
        <h2 className="t-heading">Course colors</h2>
        <Row>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <span key={s} className="dev-swatch" style={courseStyle(getCourseColor(s))}>
              <CourseDot size={10} />
              <CodeTag>SLOT {s}</CodeTag>
              <span style={{ width: 120 }}><ProgressBar value={s * 15} dim /></span>
            </span>
          ))}
        </Row>
      </Card>
      <Card>
        <h2 className="t-heading">Pills and chips</h2>
        <Row>
          <Pill tone="accent">Due 11:59 PM tonight</Pill>
          <Pill tone="good">No sign in needed</Pill>
          <Pill tone="warn">UA sign in</Pill>
          <Pill tone="neutral">Coding</Pill>
          <Pill tone="new" tiny>New grade</Pill>

        </Row>
        <Row>
          <Chip>Study help before my MKT 300 exam</Chip>
          {["all", "money", "health"].map((c) => (
            <Chip key={c} filter pressed={chip === c} onClick={() => setChip(c)}>{c}</Chip>
          ))}
        </Row>
      </Card>
      <Card>
        <h2 className="t-heading">Segmented, steps, notice</h2>
        <div style={{ maxWidth: 320 }}>
          <Segmented label="Target grade" options={[["A", "A"], ["B", "B"], ["C", "C"]]} value={seg} onChange={setSeg} />
        </div>
        <StepList steps={["Go to the site", "Sign in with your UA account", "Book a time"]} />
        <Notice action="Sign in again" onAction={() => {}}>Your Blackboard sign in ran out. Due dates and grades may be a little old.</Notice>
      </Card>
      <Card>
        <h2 className="t-heading">Icons</h2>
        <Row>
          {ICON_NAMES.map((n) => (
            <span key={n} className="dev-icon" title={n}><Icon name={n} size={20} /></span>
          ))}
        </Row>
      </Card>
      <Card>
        <h2 className="t-heading">Loading</h2>
        <Skeleton height={56} />
        <Skeleton height={56} width="70%" />
      </Card>
    </div>
  );
}
