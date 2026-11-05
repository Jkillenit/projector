/**
 * Rule 5 and rule 4 for anything a connection sends. Every send goes through prepareSend():
 * it refuses grade or course data, and returns the exact text the student confirms before the send.
 */

// Keys that would carry grades or course work. Never sent to any connection (rule 4).
const FORBIDDEN = /grade|score|gpa|points|mark|assignment|submission|transcript/i;

/** Throws if anything in `payload` (at any depth) looks like grades or course data. */
export function assertSafeToSend(payload, path = "") {
  if (payload == null || typeof payload !== "object") return;
  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN.test(key)) throw new Error(`Not sent: "${path}${key}" looks like grades or course data (rule 4).`);
    assertSafeToSend(value, `${path}${key}.`);
  }
}

/**
 * `action`: { service, verb, summary: string[], payload }. Returns { title, lines, payload } for the confirm dialog.
 * `lines` lists every value that will be sent, so the student sees exactly what leaves the app.
 */
export function prepareSend(action) {
  const { service, verb, summary = [], payload = {} } = action || {};
  if (!service || !verb) throw new Error("A send needs a service and a verb.");
  assertSafeToSend(payload);
  const sent = Object.entries(payload).map(([k, v]) => `${k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase()}: ${Array.isArray(v) ? v.join(", ") : v}`);
  return { title: `${verb} with ${service}?`, lines: summary.filter(Boolean), sent, payload };
}
