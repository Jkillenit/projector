// Pure camera math for the campus scene. A view is { position: [x, y, z], target: [x, y, z] } in 3D meters (up is y).
// A pose is the same view said the way people think about it: { target: [x, z], size, tilt, azimuth, fov }.
// size is how many meters tall the view is at the target, tilt is degrees from straight down,
// azimuth is the turn in radians (0 is north up), fov is the lens in degrees.

/** The three views. Map and 2.5D use a long lens, so they look flat like a map (#117). */
export const MODES = {
  map: { tilt: 0, fov: 6, size: 1350, locked: true },
  tilt: { tilt: 35, fov: 6, size: 1350, locked: true },
  "3d": { tilt: 49, fov: 45, size: 880, locked: false },
};
/** How close and how far the view can zoom, in meters tall. */
export const SIZE_RANGE = [100, 5000];

/** Slow at both ends, fast in the middle. */
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const rad = (deg) => (deg * Math.PI) / 180;
const mix = (a, b, k) => a + (b - a) * k;

/** How far the camera stands to see size meters with this lens. */
export const distanceFor = (size, fov) => size / 2 / Math.tan(rad(fov) / 2);

/** The pose of one mode, looking at target. */
export function poseFor(mode, target, size = MODES[mode].size) {
  const { tilt, fov } = MODES[mode];
  return { target, size, tilt, azimuth: 0, fov };
}

/** The camera for a pose: { position, target, fov }. */
export function cameraFrom({ target: [x, z], size, tilt, azimuth, fov }) {
  const d = distanceFor(size, fov);
  const side = d * Math.sin(rad(tilt));
  return {
    target: [x, 0, z],
    position: [x + side * Math.sin(azimuth), d * Math.cos(rad(tilt)), z + side * Math.cos(azimuth)],
    fov,
  };
}

/** Near and far planes for a lens that cover every zoom in SIZE_RANGE. */
export const clipFor = (fov) => ({ near: distanceFor(SIZE_RANGE[0], fov) / 20, far: distanceFor(SIZE_RANGE[1], fov) * 2 + 12000 });

/** The pose of a camera at position looking at target. */
export function poseOf({ position, target }, fov) {
  const o = position.map((v, i) => v - target[i]);
  const d = Math.hypot(...o) || 1;
  return {
    target: [target[0], target[2]],
    size: 2 * d * Math.tan(rad(fov) / 2),
    tilt: (Math.acos(Math.min(1, o[1] / d)) * 180) / Math.PI,
    azimuth: Math.atan2(o[0], o[2]),
    fov,
  };
}

/** A pose partway from a to b, eased. Zoom moves by ratio and the turn takes the short way round. t is clamped to 0..1. */
export function blend(a, b, t) {
  const k = ease(Math.min(1, Math.max(0, t)));
  const turn = ((((b.azimuth - a.azimuth + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return {
    target: [mix(a.target[0], b.target[0], k), mix(a.target[1], b.target[1], k)],
    size: a.size * (b.size / a.size) ** k,
    tilt: mix(a.tilt, b.tilt, k),
    azimuth: a.azimuth + turn * k,
    fov: mix(a.fov, b.fov, k),
  };
}

/** A view that frames a place from the south, a little above, farther back for taller buildings. */
export function viewFor(place) {
  const [x, z] = place.c;
  const back = 260 + (place.h || 0) * 4;
  return { target: [x, 0, z], position: [x, back * 0.9, z + back] };
}
