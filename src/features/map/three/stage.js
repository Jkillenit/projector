// What every 3D view needs: loading three, a renderer that fits its box, a camera with controls, lights,
// shapes from extrude.js, colors from our tokens, and clean up. Used by Campus3D and Walkthrough.
import { extrudeRings } from "./extrude.js";
import { deviceTier, shadowBox, SUN } from "./quality.js";

const SHADOW_MAP = 4096; // shadow pixels per side
const SUN_FAR = 2000; // how far up the sun's shadow camera stands, meters

export const NO_WEBGL = "3D needs WebGL, and this browser has it turned off.";
export const NO_LOAD = "3D did not load.";

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** three, its camera controls and its HTML label layer, loaded only when a 3D view opens (#53). */
export const loadThree = () =>
  Promise.all([import("three"), import("three/addons/controls/OrbitControls.js"), import("three/addons/renderers/CSS2DRenderer.js")]).then(
    ([THREE, { OrbitControls }, { CSS2DRenderer, CSS2DObject }]) => ({ THREE, OrbitControls, CSS2DRenderer, CSS2DObject }),
  );

export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

/**
 * A 3D stage in host. theme() is called now and whenever the theme changes, so colors follow our tokens.
 * Pass overlay(size) to get an HTML layer over the scene (CSS2DObjects): it runs before each draw of that layer.
 * Returns { THREE, scene, camera, controls, render, add, geometry, solid, dispose }.
 */
export function createStage({ THREE, OrbitControls, CSS2DRenderer }, host, { near = 1, far = 12000, theme = () => {}, overlay = null, outdoor = false } = {}) {
  const quality = deviceTier();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(quality.maxPixelRatio, window.devicePixelRatio || 1));
  host.appendChild(renderer.domElement);
  const html = overlay ? new CSS2DRenderer() : null;
  if (html) {
    html.domElement.className = "map-3d-html";
    host.appendChild(html.domElement);
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 4 / 3, near, far);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.45; // never under the ground
  controls.listenToKeyEvents(host);

  // Outdoors (#124): more sun and less sky, so the shade side of a building and its shadow read clearly.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, outdoor ? 1.5 : 2));
  const sun = new THREE.DirectionalLight(0xffffff, outdoor ? 1.9 : 1.2);
  sun.position.set(...SUN);
  scene.add(sun, sun.target);
  // Real shadows on High: the shadow map follows the view, so it stays sharp at every zoom.
  const shadows = outdoor && quality.shadows;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    sun.shadow.radius = 4; // soft edges
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.6;
  }
  const viewSize = () => 2 * camera.position.distanceTo(controls.target) * Math.tan((camera.fov * Math.PI) / 360); // meters tall at the target
  const followSun = () => {
    const size = viewSize();
    const { center: [x, z], half } = shadowBox([controls.target.x, controls.target.z], size, camera.aspect, SHADOW_MAP);
    sun.target.position.set(x, 0, z);
    sun.position.set(x + SUN[0] * SUN_FAR, SUN[1] * SUN_FAR, z + SUN[2] * SUN_FAR);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: SUN_FAR * 2 });
    sun.shadow.camera.updateProjectionMatrix();
  };
  // Haze (#124): ground past the middle of the view fades a little, so the far edge in 2.5D and 3D has depth. Map looks straight down, so it stays crisp.
  if (outdoor) scene.fog = new THREE.Fog(0xffffff, 1, 2);
  const haze = () => {
    const [d, size] = [camera.position.distanceTo(controls.target), viewSize()];
    Object.assign(scene.fog, { near: d, far: d + size * 1.1 });
  };

  const owned = [];
  const add = (obj) => { scene.add(obj); owned.push(obj); return obj; };
  const geometry = (positions, indices) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (indices) g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  /** extrudeRings as one geometry. */
  const solid = (rings, h, opts) => {
    const p = [], ix = [];
    for (const s of extrudeRings(rings, h, opts)) {
      const base = p.length / 3;
      for (const v of s.positions) p.push(v);
      for (const i of s.indices) ix.push(base + i);
    }
    return geometry(p, ix);
  };

  const size = { w: 1, h: 1 };
  const render = () => {
    if (shadows) followSun();
    if (outdoor) haze();
    renderer.render(scene, camera);
    if (!html) return;
    overlay(size);
    html.render(scene, camera);
  };
  controls.addEventListener("change", render);
  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    html?.setSize(w, h);
    Object.assign(size, { w, h });
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const resize = new ResizeObserver(fit);
  resize.observe(host);

  const recolor = () => {
    renderer.setClearColor(new THREE.Color(token("--surface-2")));
    scene.fog?.color.set(token("--surface-2"));
    theme();
    render();
  };
  const themeWatch = new MutationObserver(recolor);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", recolor);

  return {
    THREE, scene, camera, controls, renderer, render, add, geometry, solid, shadows,
    /** Call once the scene is built. */
    start() { recolor(); fit(); },
    dispose() {
      resize.disconnect();
      themeWatch.disconnect();
      media?.removeEventListener?.("change", recolor);
      controls.dispose();
      for (const o of owned) {
        o.traverse?.((c) => { c.geometry?.dispose(); c.material?.dispose?.(); });
      }
      renderer.dispose();
      renderer.domElement.remove();
      html?.domElement.remove();
    },
  };
}
