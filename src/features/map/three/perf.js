// Pure: numbers for the phone check readout (#129). Open the map with ?perf in the address, for example
// <the Pages link>/#/map?perf=1, then drag the map. Does not import three.

export const IDLE = 250; // ms: a longer gap between frames means the map was still, not slow
const KEEP = 120; // samples kept
const SLOW = 1000 / 30 + 0.5; // a frame longer than this is under 30 fps

/** A quantile of a list of numbers, 0 to 1. Empty gives 0. */
export function quantile(list, q) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** Adds one sample and keeps the last KEEP. Returns the new list. */
export function keep(list, x) {
  const next = [...list, x];
  return next.length > KEEP ? next.slice(next.length - KEEP) : next;
}

/**
 * What the readout shows. drawMs: how long each draw took on the CPU. frames: when each screen frame came
 * while the map was moving. Gaps of IDLE or more are the map sitting still, so they never count as slow.
 * Returns { draws, drawMs, drawP90, fps, slowShare }: slowShare is the share of frames under 30 fps.
 */
export function summarize(drawMs, frames) {
  const gaps = frames.slice(1).map((t, i) => t - frames[i]).filter((g) => g < IDLE);
  const moving = gaps.reduce((a, b) => a + b, 0); // the average, not the typical frame: a stutter has to show
  return {
    draws: drawMs.length,
    drawMs: quantile(drawMs, 0.5),
    drawP90: quantile(drawMs, 0.9),
    fps: moving ? Math.round((1000 * gaps.length) / moving) : 0,
    slowShare: gaps.length ? gaps.filter((g) => g > SLOW).length / gaps.length : 0,
  };
}

/** One short line for the readout. */
export function perfLine(s, tier) {
  if (!s.draws) return `${tier} tier. Drag the map to measure.`;
  return `${tier} tier · ${s.fps} fps · ${Math.round(s.slowShare * 100)}% slow frames · draw ${s.drawMs.toFixed(1)} ms, slowest tenth ${s.drawP90.toFixed(1)} ms`;
}
