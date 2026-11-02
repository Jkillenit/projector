import { BLACKBOARD_URL } from "../../constants/app.js";

/**
 * Live mode: opens the URL in the signed-in Blackboard window. Demo mode (or no URL): a plain new tab
 * on Blackboard's own site. Projector never signs in for the student.
 */
export function openInBlackboard(url) {
  const bb = window.studyHub?.blackboard;
  if (url && bb?.openUrl) {
    void bb.openUrl(url);
    return;
  }
  window.open(BLACKBOARD_URL, "_blank", "noopener,noreferrer");
}
