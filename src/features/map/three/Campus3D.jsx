import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/index.jsx";
import campus from "../campus.json";
import { extrudeRings, pathToRings } from "./extrude.js";
import { mergeBuildings, roadSegments } from "./campusMesh.js";

const NO_WEBGL = "3D needs WebGL, and this browser has it turned off. Showing the 2D map.";
const NO_LOAD = "3D did not load. Showing the 2D map.";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

/** Builds the scene once. Returns { setPicked, setPins, zoom, reset, dispose }. */
function setup(THREE, OrbitControls, host, { buildings, center, onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 4 / 3, 1, 12000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.45; // never under the ground
  controls.minDistance = 60;
  controls.maxDistance = 5000;
  controls.listenToKeyEvents(host);
  const home = () => {
    controls.target.set(center[0], 0, center[1]);
    camera.position.set(center[0], 700, center[1] + 800);
    controls.update();
  };
  home();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-400, 900, 300);
  scene.add(sun);

  const owned = [];
  const add = (obj) => { scene.add(obj); owned.push(obj); return obj; };
  const geometry = (positions, indices) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (indices) g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  const flat = (rings, h) => {
    const p = [], ix = [];
    for (const s of extrudeRings(rings, h)) {
      const base = p.length / 3;
      p.push(...s.positions);
      ix.push(...s.indices.map((i) => base + i));
    }
    return geometry(p, ix);
  };

  const [x0, y0, x1, y1] = campus.bounds;
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshLambertMaterial()));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x0 + x1) / 2, -0.1, (y0 + y1) / 2);
  const areas = add(new THREE.Mesh(flat(campus.areas.flatMap((a) => pathToRings(a.path)), 0.3), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.25 })));
  const roads = add(new THREE.LineSegments(geometry(roadSegments(campus.roads, 0.5)), new THREE.LineBasicMaterial()));
  const context = add(new THREE.Mesh(flat(pathToRings(campus.context), 3), new THREE.MeshLambertMaterial()));

  // Named buildings: one mesh, colored per vertex so one building can light up.
  const merged = mergeBuildings(buildings);
  const named = geometry(merged.positions, merged.indices);
  const colors = new Float32Array(merged.positions.length);
  named.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const town = add(new THREE.Mesh(named, new THREE.MeshLambertMaterial({ vertexColors: true })));
  const edges = add(new THREE.LineSegments(new THREE.EdgesGeometry(named, 30), new THREE.LineBasicMaterial()));

  const pinGroup = add(new THREE.Group());
  const classShape = new THREE.BoxGeometry(14, 14, 14);
  const eventShape = new THREE.SphereGeometry(8, 16, 12);
  const classMat = new THREE.MeshLambertMaterial();
  const sessionMat = new THREE.MeshLambertMaterial();
  const eventMat = new THREE.MeshLambertMaterial();

  let picked = null;
  const paint = () => {
    const base = new THREE.Color(token("--surface-hover"));
    const on = new THREE.Color(token("--accent"));
    for (const o of merged.owners) {
      const c = o.id === picked ? on : base;
      for (let v = o.start; v < o.end; v++) c.toArray(colors, v * 3);
    }
    named.attributes.color.needsUpdate = true;
  };
  const theme = () => {
    renderer.setClearColor(new THREE.Color(token("--surface-2")));
    ground.material.color.set(token("--surface-2"));
    areas.material.color.set(token("--good"));
    roads.material.color.set(token("--border-strong"));
    context.material.color.set(token("--track"));
    edges.material.color.set(token("--border-strong"));
    classMat.color.set(token("--good"));
    sessionMat.color.set(token("--support-fill"));
    eventMat.color.set(token("--accent"));
    paint();
    render();
  };

  const render = () => renderer.render(scene, camera);
  controls.addEventListener("change", render);
  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const resize = new ResizeObserver(fit);
  resize.observe(host);

  // Theme: data-theme on <html>, or the system setting.
  const themeWatch = new MutationObserver(theme);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", theme);

  // Tap (not drag) picks a pin or a building.
  const ray = new THREE.Raycaster();
  let down = null;
  const onDown = (e) => { down = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 4) return;
    const box = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...pinGroup.children, town])[0];
    if (!hit) return;
    onPick.current(hit.object === town ? merged.triOwner[hit.faceIndex] : hit.object.userData.key);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  const zoom = (f) => {
    const offset = camera.position.clone().sub(controls.target);
    const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * f));
    camera.position.copy(controls.target).add(offset.setLength(d));
    controls.update();
  };
  const onKey = (e) => {
    if (e.key === "+" || e.key === "=") zoom(1 / 1.5);
    else if (e.key === "-" || e.key === "_") zoom(1.5);
  };
  host.addEventListener("keydown", onKey);

  theme();
  fit();

  return {
    setPicked(id) {
      picked = id;
      paint();
      render();
    },
    setPins(classSpots, pins) {
      pinGroup.clear();
      const top = (place) => (place?.h || 4) + 14;
      for (const p of classSpots) {
        const m = new THREE.Mesh(classShape, p.classes.every((c) => c.session) ? sessionMat : classMat);
        m.position.set(p.xy[0] - 10, top(p.place), p.xy[1] - 10);
        m.userData.key = p.key;
        pinGroup.add(m);
      }
      for (const p of pins) {
        const m = new THREE.Mesh(eventShape, eventMat);
        m.position.set(p.xy[0], top(p.place), p.xy[1]);
        m.userData.key = p.key;
        pinGroup.add(m);
      }
      render();
    },
    zoom,
    reset: home,
    dispose() {
      resize.disconnect();
      themeWatch.disconnect();
      media?.removeEventListener?.("change", theme);
      host.removeEventListener("keydown", onKey);
      controls.dispose();
      for (const o of owned) {
        o.geometry?.dispose();
        o.material?.dispose();
      }
      for (const x of [classShape, eventShape, classMat, sessionMat, eventMat]) x.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/**
 * The campus in 3D. Loads three only when shown (#53). Tapping a building or pin calls onPick with the same
 * ids and keys as the 2D map, so the place panel works the same. Calls onFail(message) when 3D cannot run.
 */
export function Campus3D({ buildings, center, picked, classSpots, pins, onPick, onFail }) {
  const host = useRef(null);
  const scene = useRef(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    if (!hasWebGL()) {
      onFail(NO_WEBGL);
      return undefined;
    }
    Promise.all([import("three"), import("three/addons/controls/OrbitControls.js")])
      .then(([THREE, { OrbitControls }]) => {
        if (gone) return;
        scene.current = setup(THREE, OrbitControls, host.current, { buildings, center, onPick: pick });
        setReady(true);
      })
      .catch(() => !gone && onFail(NO_LOAD));
    return () => {
      gone = true;
      scene.current?.dispose();
      scene.current = null;
    };
    // Built once per mount; picked and pins update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (ready) scene.current?.setPicked(picked); }, [ready, picked]);
  useEffect(() => { if (ready) scene.current?.setPins(classSpots, pins); }, [ready, classSpots, pins]);

  return (
    <>
      <div
        ref={host}
        className="map-3d"
        tabIndex={0}
        role="application"
        aria-label="Campus map in 3D. Drag to turn, scroll to zoom. Arrow keys move, Shift and arrows turn, plus and minus zoom."
      >
        {ready ? null : <p className="map-3d-wait t-small t-muted">Loading 3D…</p>}
      </div>
      <div className="map-zoom">
        <Button size="sm" aria-label="Zoom in" onClick={() => scene.current?.zoom(1 / 1.5)}>+</Button>
        <Button size="sm" aria-label="Zoom out" onClick={() => scene.current?.zoom(1.5)}>−</Button>
        <Button size="sm" onClick={() => { scene.current?.reset(); onPick(null); }}>Reset</Button>
      </div>
    </>
  );
}
