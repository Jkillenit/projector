import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/index.jsx";
import campus from "../campus.json";
import { pathToRings } from "./extrude.js";
import { mergeBuildings, roadSegments } from "./campusMesh.js";
import { flyPath, viewFor } from "./camera.js";
import { createStage, hasWebGL, loadThree, NO_LOAD, NO_WEBGL, token } from "./stage.js";
import { isReducedMotion } from "../../../shell/motion.js";

const FLY_MS = 1500;
const TO_2D = " Showing the 2D map.";

/** Builds the scene once. Returns { setPicked, setPins, fly, zoom, reset, dispose }. */
function setup(three, host, { buildings, center, onPick }) {
  const stage = createStage(three, host, { theme: () => theme() });
  const { THREE, camera, controls, render, add, geometry, solid, renderer } = stage;
  controls.minDistance = 60;
  controls.maxDistance = 5000;
  const home = () => {
    controls.target.set(center[0], 0, center[1]);
    camera.position.set(center[0], 700, center[1] + 800);
    controls.update();
  };
  home();

  const [x0, y0, x1, y1] = campus.bounds;
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshLambertMaterial()));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x0 + x1) / 2, -0.1, (y0 + y1) / 2);
  const areas = add(new THREE.Mesh(solid(campus.areas.flatMap((a) => pathToRings(a.path)), 0.3), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.25 })));
  const roads = add(new THREE.LineSegments(geometry(roadSegments(campus.roads, 0.5)), new THREE.LineBasicMaterial()));
  const context = add(new THREE.Mesh(solid(pathToRings(campus.context), 3), new THREE.MeshLambertMaterial()));

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
    const base = new THREE.Color(token("--map-building"));
    const on = new THREE.Color(token("--map-pick"));
    for (const o of merged.owners) {
      const c = o.id === picked ? on : base;
      for (let v = o.start; v < o.end; v++) c.toArray(colors, v * 3);
    }
    named.attributes.color.needsUpdate = true;
  };
  function theme() {
    ground.material.color.set(token("--map-ground"));
    areas.material.color.set(token("--map-grass"));
    roads.material.color.set(token("--map-road"));
    context.material.color.set(token("--map-building"));
    edges.material.color.set(token("--map-roof"));
    classMat.color.set(token("--good"));
    sessionMat.color.set(token("--support-fill"));
    eventMat.color.set(token("--accent"));
    paint();
  }

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

  // Fly to a place. A new flight starts from wherever the camera is; grabbing the map stops it.
  let flight = 0;
  const stop = () => cancelAnimationFrame(flight);
  controls.addEventListener("start", stop);
  const put = (v) => {
    camera.position.set(...v.position);
    controls.target.set(...v.target);
    controls.update();
  };
  const fly = (place) => {
    stop();
    const to = viewFor(place);
    if (isReducedMotion()) return put(to);
    const from = { position: camera.position.toArray(), target: controls.target.toArray() };
    const t0 = performance.now();
    const step = (now) => {
      const t = (now - t0) / FLY_MS;
      put(flyPath(from, to, t));
      if (t < 1) flight = requestAnimationFrame(step);
    };
    flight = requestAnimationFrame(step);
  };

  stage.start();

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
    fly,
    zoom,
    reset: () => { stop(); home(); },
    dispose() {
      stop();
      host.removeEventListener("keydown", onKey);
      for (const x of [classShape, eventShape, classMat, sessionMat, eventMat]) x.dispose();
      stage.dispose();
    },
  };
}

/**
 * The campus in 3D. Loads three only when shown (#53). Tapping a building or pin calls onPick with the same
 * ids and keys as the 2D map, so the place panel works the same. Calls onFail(message) when 3D cannot run.
 * flyTo: { place } flies the camera there (#59); pass a new object for each tap, even to the same place.
 */
export function Campus3D({ buildings, center, picked, flyTo, classSpots, pins, onPick, onFail }) {
  const host = useRef(null);
  const scene = useRef(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    if (!hasWebGL()) {
      onFail(NO_WEBGL + TO_2D);
      return undefined;
    }
    loadThree()
      .then((three) => {
        if (gone) return;
        scene.current = setup(three, host.current, { buildings, center, onPick: pick });
        setReady(true);
      })
      .catch(() => !gone && onFail(NO_LOAD + TO_2D));
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
  useEffect(() => { if (ready && flyTo?.place) scene.current?.fly(flyTo.place); }, [ready, flyTo]);

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
