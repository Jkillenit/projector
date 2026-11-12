// Pure: how hard the 3D map works on this device, and where the sun's shadow box sits (#124). Does not import three.

/** High: real soft shadows, sharp pixels. Low (phones): a dark patch under each building and tree, pixel ratio 1. */
export const TIERS = {
  high: { name: "high", shadows: true, maxPixelRatio: 2 },
  low: { name: "low", shadows: false, maxPixelRatio: 1 },
};

/** A phone (touch and a small screen) or a weak machine gets Low. */
export function qualityTier({ coarse = false, shortSide = 1080, cores = 8 } = {}) {
  return (coarse && shortSide < 768) || cores <= 2 ? TIERS.low : TIERS.high;
}

/** This browser's tier. */
export const deviceTier = () =>
  qualityTier({
    coarse: !!window.matchMedia?.("(pointer: coarse)").matches,
    shortSide: Math.min(window.screen?.width || 1080, window.screen?.height || 1080),
    cores: navigator.hardwareConcurrency || 8,
  });

/** Light comes from the north west, high up, so shadows fall down and right on a north up map, like UA's map. */
export const SUN = (() => {
  const [x, y, z] = [-0.55, 1, -0.75];
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
})();

/** Where a shadow lands on the ground for something h meters tall: [dx, dz]. */
export const shadowOffset = (h) => [(-SUN[0] / SUN[1]) * h, (-SUN[2] / SUN[1]) * h];

/**
 * The square of ground the shadow map covers, for a view `size` meters tall and `aspect` wide per tall around target [x, z].
 * Snapped to whole shadow pixels, so shadows do not shimmer while the map pans. Returns { center: [x, z], half }.
 */
export function shadowBox([x, z], size, aspect, mapSize) {
  const half = (size * Math.max(aspect, 1)) / 2 + 60; // + the longest shadow at the edge
  const texel = (half * 2) / mapSize;
  return { center: [Math.round(x / texel) * texel, Math.round(z / texel) * texel], half };
}
