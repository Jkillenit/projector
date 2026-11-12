import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/index.jsx";
import campus from "../campus.json";
import { pathToRings } from "./extrude.js";
import { addRibbons, GROUND_LAYERS, mergeBuildings, PATH_WIDTH, roadWidth } from "./campusMesh.js";
import { blend, cameraFrom, clipFor, distanceFor, MODES, poseFor, poseOf, SIZE_RANGE, viewFor } from "./camera.js";
import { createStage, hasWebGL, loadThree, NO_LOAD, NO_WEBGL, token } from "./stage.js";
import { isReducedMotion } from "../../../shell/motion.js";

const FLY_MS = 1500;
const MODE_MS = 700;
const TO_2D = " Showing the 2D map.";

/** Builds the scene once. Returns { setPicked, setPins, setMode, fly, zoom, reset, dispose }. */
function setup(three, host, { buildings, center, mode: firstMode, nature, onPick }) {
  const stage = createStage(three, host, { theme: () => theme() });
  const { THREE, camera, controls, render, add, geometry, solid, renderer } = stage;
  controls.screenSpacePanning = false; // pan along the ground, so 2.5D and 3D never lift off it
  let mode = firstMode;

  // The ground: flat layers drawn bottom first, without depth, so they never flicker against each other.
  // shortcut: the river line is left out, the water outlines already cover it; draw it if a gap shows.
  const flat = (geo, order) => {
    const m = add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ depthWrite: false, side: THREE.DoubleSide })));
    m.renderOrder = order - 100;
    m.position.y = order * 0.05;
    return m;
  };
  const [x0, y0, x1, y1] = campus.bounds;
  const ground = flat(new THREE.PlaneGeometry(20000, 20000), -1);
  ground.rotation.x = -Math.PI / 2;
  ground.position.x = (x0 + x1) / 2;
  ground.position.z = (y0 + y1) / 2;
  const ribbons = (name) => {
    const s = { positions: [], indices: [] };
    if (name === "paths") addRibbons(s, nature.paths, PATH_WIDTH);
    else for (const [type, d] of Object.entries(nature.roads)) addRibbons(s, d, roadWidth(type));
    return geometry(s.positions, s.indices);
  };
  const layers = GROUND_LAYERS.map((name, i) => {
    const geo = name === "roads" || name === "paths" ? ribbons(name) : solid(pathToRings(nature[name]), 0.01, { walls: false });
    const m = flat(geo, i);
    m.userData.token = `--map-${{ roads: "road", paths: "path" }[name] || name}`;
    return m;
  });
  // Unnamed buildings at their own heights, one mesh. Not tappable, so a grayer color.
  const others = mergeBuildings(nature.outlines);
  const context = add(new THREE.Mesh(geometry(others.positions, others.indices), new THREE.MeshLambertMaterial()));

  // Tappable shapes: one mesh each, colored per vertex (RGBA) so one place can light up. Areas are a thin see-through tint.
  const tappable = (places, h, size, material) => {
    const merged = mergeBuildings(places.map((p) => ({ id: p.id, path: p.path, h: h ?? p.h })));
    const geo = geometry(merged.positions, merged.indices);
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array((merged.positions.length / 3) * size), size));
    const mesh = add(new THREE.Mesh(geo, material));
    mesh.userData.merged = merged;
    return mesh;
  };
  const areas = tappable(campus.areas, 0.3, 4, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
  const town = tappable(buildings, null, 3, new THREE.MeshLambertMaterial({ vertexColors: true }));
  const edges = add(new THREE.LineSegments(new THREE.EdgesGeometry(town.geometry, 30), new THREE.LineBasicMaterial()));

  const pinGroup = add(new THREE.Group());
  const classShape = new THREE.BoxGeometry(14, 14, 14);
  const eventShape = new THREE.SphereGeometry(8, 16, 12);
  const classMat = new THREE.MeshLambertMaterial();
  const sessionMat = new THREE.MeshLambertMaterial();
  const eventMat = new THREE.MeshLambertMaterial();

  let picked = null;
  let hovered = null;
  const paint = () => {
    const on = new THREE.Color(token("--map-pick"));
    const near = new THREE.Color(token("--map-hover"));
    for (const [mesh, base, alpha] of [[town, new THREE.Color(token("--map-building")), 1], [areas, new THREE.Color(token("--map-grass")), 0.25]]) {
      const attr = mesh.geometry.attributes.color;
      for (const o of mesh.userData.merged.owners) {
        const lit = o.id === picked || o.id === hovered;
        const c = o.id === picked ? on : o.id === hovered ? near : base;
        for (let v = o.start; v < o.end; v++) {
          c.toArray(attr.array, v * attr.itemSize);
          if (attr.itemSize === 4) attr.array[v * 4 + 3] = lit ? 0.5 : alpha;
        }
      }
      attr.needsUpdate = true;
    }
  };
  function theme() {
    ground.material.color.set(token("--map-ground"));
    for (const m of layers) m.material.color.set(token(m.userData.token));
    context.material.color.set(token("--map-context"));
    edges.material.color.set(token("--map-roof"));
    classMat.color.set(token("--good"));
    sessionMat.color.set(token("--support-fill"));
    eventMat.color.set(token("--accent"));
    paint();
  }

  // What is under the pointer: a pin key, a building or area id, or null. The nearest hit wins, so a building beats the area around it.
  const ray = new THREE.Raycaster();
  const under = (e) => {
    const box = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...pinGroup.children, town, areas])[0];
    if (!hit) return null;
    return hit.object.userData.merged ? hit.object.userData.merged.triOwner[hit.faceIndex] : hit.object.userData.key;
  };
  // Tap (not drag) picks.
  let down = null;
  const onDown = (e) => { down = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 4) return;
    const id = under(e);
    if (id) onPick.current(id);
  };
  // Hover tints a place on desktop: a mouse with no button held, checked once a frame.
  let hoverFrame = 0;
  const hover = (id) => {
    renderer.domElement.style.cursor = id ? "pointer" : "";
    if (id === hovered) return;
    hovered = id;
    paint();
    render();
  };
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || e.buttons || hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      hover(under(e));
    });
  };
  const onLeave = () => hover(null);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerleave", onLeave);

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

  // Map and 2.5D: fixed tilt, north up, left drag pans. 3D: free orbit. Set once the camera has arrived.
  const settle = () => {
    const m = MODES[mode];
    const tilt = (m.tilt * Math.PI) / 180;
    controls.minPolarAngle = m.locked ? tilt : 0;
    controls.maxPolarAngle = m.locked ? tilt : Math.PI * 0.45; // never under the ground
    controls.minAzimuthAngle = m.locked ? 0 : -Infinity;
    controls.maxAzimuthAngle = m.locked ? 0 : Infinity;
    controls.enableRotate = !m.locked;
    controls.mouseButtons.LEFT = m.locked ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = m.locked ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controls.minDistance = distanceFor(SIZE_RANGE[0], m.fov);
    controls.maxDistance = distanceFor(SIZE_RANGE[1], m.fov);
    controls.update();
    render();
  };
  const put = (pose) => {
    const c = cameraFrom(pose);
    Object.assign(camera, { fov: c.fov }, clipFor(c.fov));
    camera.updateProjectionMatrix();
    camera.position.set(...c.position);
    controls.target.set(...c.target);
    camera.lookAt(controls.target);
    render();
  };
  const now = () => poseOf({ position: camera.position.toArray(), target: controls.target.toArray() }, camera.fov);

  // Move the camera to a pose. A new move starts from wherever the camera is; grabbing the map stops it.
  let flight = 0;
  const stop = () => {
    if (!flight) return;
    cancelAnimationFrame(flight);
    flight = 0;
    settle();
  };
  controls.addEventListener("start", stop);
  const go = (to, ms) => {
    stop();
    if (isReducedMotion()) {
      put(to);
      return settle();
    }
    const from = now();
    const t0 = performance.now();
    const step = (time) => {
      const t = (time - t0) / ms;
      put(blend(from, to, t));
      if (t < 1) flight = requestAnimationFrame(step);
      else {
        flight = 0;
        settle();
      }
    };
    flight = requestAnimationFrame(step);
  };
  const fly = (place) => {
    const here = now();
    go(mode === "3d" ? poseOf(viewFor(place), MODES["3d"].fov) : { ...here, target: place.c, size: Math.min(here.size, 600) }, FLY_MS);
  };
  const setMode = (next) => {
    if (next === mode) return;
    mode = next;
    const here = now();
    go({ ...poseFor(mode, here.target, here.size), azimuth: MODES[mode].locked ? 0 : here.azimuth }, MODE_MS);
  };
  const home = () => {
    put(poseFor(mode, center));
    settle();
  };
  home();

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
    setMode,
    zoom,
    reset: () => { stop(); home(); },
    dispose() {
      stop();
      cancelAnimationFrame(hoverFrame);
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
 * mode: "map" (flat, from above), "tilt" (2.5D) or "3d" (free orbit). Changing it moves the camera, the scene stays (#117).
 */
export function Campus3D({ buildings, center, mode, picked, flyTo, classSpots, pins, onPick, onFail }) {
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
    // Ground and other buildings load only with the scene, so the 2D map stays light.
    Promise.all([loadThree(), import("../campus-nature.json")])
      .then(([three, { default: nature }]) => {
        if (gone) return;
        scene.current = setup(three, host.current, { buildings, center, mode, nature, onPick: pick });
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
  useEffect(() => { if (ready) scene.current?.setMode(mode); }, [ready, mode]);
  useEffect(() => { if (ready && flyTo?.place) scene.current?.fly(flyTo.place); }, [ready, flyTo]);

  return (
    <>
      <div
        ref={host}
        className="map-3d"
        tabIndex={0}
        role="application"
        aria-label={MODES[mode].locked
          ? "Campus map. Drag or arrow keys move, scroll or plus and minus zoom."
          : "Campus map in 3D. Drag to turn, scroll to zoom. Arrow keys move, Shift and arrows turn, plus and minus zoom."}
      >
        {ready ? null : <p className="map-3d-wait t-small t-muted">Loading the map…</p>}
      </div>
      <div className="map-zoom">
        <Button size="sm" aria-label="Zoom in" onClick={() => scene.current?.zoom(1 / 1.5)}>+</Button>
        <Button size="sm" aria-label="Zoom out" onClick={() => scene.current?.zoom(1.5)}>−</Button>
        <Button size="sm" onClick={() => { scene.current?.reset(); onPick(null); }}>Reset</Button>
      </div>
    </>
  );
}
