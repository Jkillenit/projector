// Pure camera math for the 3D map. A view is { position: [x, y, z], target: [x, y, z] } in 3D meters (up is y).

/** Slow at both ends, fast in the middle. */
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/** The camera partway from one view to another, eased. t is clamped to 0..1. */
export function flyPath(from, to, t) {
  const k = ease(Math.min(1, Math.max(0, t)));
  return { position: mix(from.position, to.position, k), target: mix(from.target, to.target, k) };
}

/** A view that frames a place from the south, a little above, farther back for taller buildings. */
export function viewFor(place) {
  const [x, z] = place.c;
  const back = 260 + (place.h || 0) * 4;
  return { target: [x, 0, z], position: [x, back * 0.9, z + back] };
}
