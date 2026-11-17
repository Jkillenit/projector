/**
 * What the campus guide says on Home. Scripted only (rule 5). Lines never use grades or course data (rule 4),
 * only the student's first name, so nothing private ends up in the bubble.
 */
export const HELLO_LINES = [
  "Need a tutor, a club or a quiet place to study? Ask me.",
  "I can point you to the right office on campus. Just ask.",
  "Not sure where something is on campus? I can help you find it.",
  "Looking for something to do this week? Ask me about clubs and events.",
];

const dayNumber = (now) => Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);

/** One line per day, the same all day, with the student's first name when there is one. */
export function guideHello(first, now = new Date()) {
  const name = String(first || "").trim();
  const line = HELLO_LINES[dayNumber(now) % HELLO_LINES.length];
  return name ? `Hi ${name}. ${line}` : `Hi. ${line}`;
}
