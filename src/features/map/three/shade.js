// Shading made in code (#179): small additions to three's own Lambert shader, and the soft shade buildings leave on the ground.
// Does not import three. No new package: the additions are GLSL text handed to material.onBeforeCompile.

const HEAD = `
varying vec3 vShadeWorld;
varying vec3 vShadeLocal;
float shadeHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float shadeNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(shadeHash(i), shadeHash(i + vec2(1.0, 0.0)), f.x), mix(shadeHash(i + vec2(0.0, 1.0)), shadeHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const VERTEX = `
#include <begin_vertex>
vec4 shadeAt = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  shadeAt = instanceMatrix * shadeAt;
#endif
vShadeWorld = (modelMatrix * shadeAt).xyz;
vShadeLocal = position;
`;

const num = (n) => Number(n).toFixed(4);

/**
 * The fragment lines for these options, in the order they run:
 * - detail { mean, near, far }: the texture fades to its flat tone `mean` (linear, 0 to 1) as one pixel grows from `near` to `far` meters,
 *   so grain, slab joints and windows show close up and never speckle from far away (#143).
 * - macro: big soft light and dark patches across the ground, this strong (0.08 is 8% either way), so lawns never look tiled.
 * - base { dark, height }: walls are `dark` times as bright at the ground, back to full by `height` meters: shade where a wall meets the lawn.
 * - crown { dark, light }: a tree crown runs from `dark` underneath to `light` on top.
 */
export function shadeLines({ detail = null, macro = 0, base = null, crown = null } = {}) {
  const lines = ["#ifdef USE_MAP", "  vec4 sampledDiffuseColor = texture2D( map, vMapUv );"];
  if (detail) lines.push(`  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(${num(detail.mean)}), smoothstep(${num(detail.near)}, ${num(detail.far)}, length(fwidth(vShadeWorld))));`);
  lines.push("  diffuseColor *= sampledDiffuseColor;", "#endif");
  if (macro) lines.push(`diffuseColor.rgb *= 1.0 + ${num(macro * 2)} * (0.6 * shadeNoise(vShadeWorld.xz / 38.0) + 0.4 * shadeNoise(vShadeWorld.xz / 131.0 + 7.3) - 0.5);`);
  if (base) lines.push(`diffuseColor.rgb *= mix(${num(base.dark)}, 1.0, smoothstep(0.0, ${num(base.height)}, vShadeWorld.y));`);
  if (crown) lines.push(`diffuseColor.rgb *= mix(${num(crown.dark)}, ${num(crown.light)}, smoothstep(-0.7, 0.8, vShadeLocal.y));`);
  return lines.join("\n");
}

/** Adds the shading in `opts` (see shadeLines) to a three material. Returns the material. */
export function shaded(material, opts) {
  const lines = shadeLines(opts);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>${HEAD}`).replace("#include <begin_vertex>", VERTEX);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>${HEAD}`).replace("#include <map_fragment>", lines);
  };
  material.customProgramCacheKey = () => lines; // one program per mix of options
  return material;
}

/** How far the ground shade reaches from a wall, meters. */
export const SHADE_REACH = 4;

/**
 * Ambient shade on the ground around buildings: a band from each wall out `reach` meters, dark at the wall and clear at its edge.
 * rings: [[[x, z], ...], ...]. Returns { positions (flat, y = 0), colors (RGBA: black, alpha 1 at the wall to 0), indices }.
 */
export function groundShade(rings, reach = SHADE_REACH) {
  const positions = [];
  const colors = [];
  const indices = [];
  for (const ring of rings || []) {
    const n = ring.length;
    const area = ring.reduce((s, [x, z], i) => s + x * ring[(i + 1) % n][1] - ring[(i + 1) % n][0] * z, 0);
    if (n < 3 || !area) continue;
    const out = ring.map((a, i) => {
      const b = ring[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [((b[1] - a[1]) / l) * Math.sign(area), (-(b[0] - a[0]) / l) * Math.sign(area)];
    });
    const base = positions.length / 3;
    ring.forEach((p, i) => {
      const [n1, n2] = [out[(i + n - 1) % n], out[i]];
      const [mx, mz] = [n1[0] + n2[0], n1[1] + n2[1]];
      const ml = Math.hypot(mx, mz) || 1;
      const k = reach / Math.max((mx * n1[0] + mz * n1[1]) / ml, 0.5) / ml; // mitered, at most twice the reach at a sharp corner
      positions.push(p[0], 0, p[1], p[0] + mx * k, 0, p[1] + mz * k);
      colors.push(0, 0, 0, 1, 0, 0, 0, 0);
      const [a, b] = [base + i * 2, base + ((i + 1) % n) * 2];
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    });
  }
  return { positions, colors, indices };
}
