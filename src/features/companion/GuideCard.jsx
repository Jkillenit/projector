import { Button, Card } from "../../components/ui/index.jsx";
import { APP_NAME } from "../../constants/app.js";
import { Brand } from "../../shell/Brand.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { guideHello } from "./guideLines.js";

/** The guide's spot on Home. The character mounts in the stage (data-companion-stage); until then it shows the logo. */
export function GuideCard({ first }) {
  return (
    <Card className="guide-card" aria-labelledby="guide-h">
      <div className="guide-stage" data-companion-stage aria-hidden>
        <Brand size={64} />
      </div>
      <div className="guide-body">
        <h2 id="guide-h" className="t-heading">Your campus guide</h2>
        <p className="guide-bubble">{guideHello(first)}</p>
        <Button href={routeHref("ask")} icon="ask" size="sm">Chat with {APP_NAME}</Button>
      </div>
    </Card>
  );
}
