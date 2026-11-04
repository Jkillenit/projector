import { useEffect, useState } from "react";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { Button, Card } from "../../components/ui/index.jsx";

export function BlackboardTab() {
  const bb = window.studyHub?.blackboard;
  const desktop = typeof bb?.getStatus === "function";
  const [status, setStatus] = useState({ loggedIn: false, windowOpen: false });

  useEffect(() => {
    if (!desktop) return undefined;
    async function checkStatus() {
      const s = await bb.getStatus();
      if (s) setStatus(s);
    }
    void checkStatus();
    window.addEventListener("focus", checkStatus);
    return () => window.removeEventListener("focus", checkStatus);
  }, [bb, desktop]);

  async function handleOpen() {
    if (status.loggedIn) await bb.openUrl(`${BLACKBOARD_URL}/ultra/course`);
    else await bb.open();
    setTimeout(async () => {
      const s = await bb.getStatus();
      if (s) setStatus(s);
    }, 1000);
  }

  async function handleDisconnect() {
    await bb.disconnect();
    setStatus({ loggedIn: false, windowOpen: false });
  }

  return (
    <Card aria-labelledby="set-bb">
      <div className="card-head">
        <h2 id="set-bb" className="t-heading">Blackboard</h2>
        <span className="t-small t-muted">{status.loggedIn ? "Connected" : "Not connected"}</span>
      </div>
      <p className="t-small t-muted">
        {desktop
          ? "Read only. You sign in once with your UA account, and that also connects myBama for your class schedule. Projector never stores your password, and your data stays on this computer."
          : "Blackboard connects in the desktop app."}
      </p>
      <div className="ui-chips">
        <Button disabled={!desktop} onClick={handleOpen} external={status.loggedIn}>{status.loggedIn ? "Open Blackboard" : "Connect Blackboard"}</Button>
        {status.loggedIn ? <Button variant="quiet" onClick={handleDisconnect}>Disconnect</Button> : null}
      </div>
    </Card>
  );
}
