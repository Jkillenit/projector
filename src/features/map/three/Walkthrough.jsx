import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip } from "../../../components/ui/index.jsx";
import { buildGraph, route } from "../indoor/route.js";
import { feet, steps as stepsOf } from "../indoor/steps.js";
import { toCampus } from "../indoor/indoorData.js";
import { floorY, pointAt, walkLine } from "./walkPath.js";
import { createStage, hasWebGL, loadThree, NO_LOAD, NO_WEBGL, token } from "./stage.js";
import { isReducedMotion } from "../../../shell/motion.js";

const WALL = 1.2; // low cut away walls, so you can see into rooms
const SPEED = 9; // meters per second the marker moves
const PAUSE_MS = 700; // between steps while playing

/** The building's floors, the goal room and the route. Returns { setLine, goTo, dispose }. */
function setup(three, host, { indoor, roomId }) {
  const stage = createStage(three, host, { near: 0.5, far: 3000, theme: () => theme() });
  const { THREE, camera, controls, render, add, solid } = stage;
  controls.minDistance = 15;
  controls.maxDistance = 400;

  const ring = (pts) => pts.map((p) => toCampus(p, indoor));
  // See-through floors, so the part of the route under an upper floor still shows.
  const slabMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.55, depthWrite: false });
  const wallMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const goalMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const routeMat = new THREE.MeshLambertMaterial();
  const markerMat = new THREE.MeshLambertMaterial();

  for (const floor of indoor.floors) {
    const y = floorY(floor.level, indoor);
    const goal = floor.rooms.find((r) => String(r.id).toUpperCase() === String(roomId).toUpperCase());
    const others = floor.rooms.filter((r) => r !== goal).map((r) => ring(r.outline));
    const slab = add(new THREE.Mesh(solid([ring(floor.outline)], 0.3), slabMat));
    slab.position.y = y - 0.3;
    const walls = add(new THREE.Mesh(solid([ring(floor.outline), ...others], WALL, { roof: false }), wallMat));
    walls.position.y = y;
    if (goal) {
      const room = add(new THREE.Group());
      room.add(new THREE.Mesh(solid([ring(goal.outline)], WALL * 1.5, { roof: false }), goalMat));
      room.add(new THREE.Mesh(solid([ring(goal.outline)], 0.05), goalMat));
      room.position.y = y;
    }
  }

  const marker = add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), markerMat));
  let path = null;
  let line = null;
  let s = 0; // where the marker is, in meters along the line

  function theme() {
    slabMat.color.set(token("--surface-hover"));
    wallMat.color.set(token("--border-strong"));
    goalMat.color.set(token("--accent"));
    routeMat.color.set(token("--support-fill"));
    markerMat.color.set(token("--good"));
  }

  // Look at the middle of the building, from the south and above.
  const [cx, cz] = toCampus(indoor.floors[0].outline.reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]).map((v) => v / indoor.floors[0].outline.length), indoor);
  const top = floorY(Math.max(...indoor.floors.map((f) => f.level)), indoor);
  controls.target.set(cx, top / 2, cz);
  camera.position.set(cx, top / 2 + 75, cz + 60);
  controls.update();

  // The camera follows the marker: move the target to it and keep the camera's offset.
  const follow = (p) => {
    const delta = new THREE.Vector3(...p).sub(controls.target);
    controls.target.add(delta);
    camera.position.add(delta);
    marker.position.set(...p);
    controls.update();
    render();
  };

  let anim = 0;
  const stop = () => cancelAnimationFrame(anim);
  stage.start();

  return {
    setLine(next) {
      stop();
      if (path) { stage.scene.remove(path); path.geometry.dispose(); }
      path = null;
      line = next;
      s = 0;
      marker.visible = !!next;
      if (next) {
        const curve = new THREE.CurvePath();
        next.points.slice(1).forEach((p, i) => curve.add(new THREE.LineCurve3(new THREE.Vector3(...next.points[i]), new THREE.Vector3(...p))));
        path = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, next.points.length * 8), 0.25, 6), routeMat);
        stage.scene.add(path);
        marker.position.set(...next.points[0]);
      }
      render();
    },
    /** Move the marker to distance `to`, then call done. Reduced motion jumps. */
    goTo(to, done) {
      stop();
      if (!line) return;
      const from = s;
      const ms = Math.min(2500, Math.max(300, (Math.abs(to - from) / SPEED) * 1000));
      if (isReducedMotion() || to === from) {
        s = to;
        follow(pointAt(line, s));
        done?.();
        return;
      }
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        s = from + (to - from) * t;
        follow(pointAt(line, s));
        if (t < 1) anim = requestAnimationFrame(tick);
        else done?.();
      };
      anim = requestAnimationFrame(tick);
    },
    dispose() {
      stop();
      if (path) path.geometry.dispose();
      for (const m of [slabMat, wallMat, goalMat, routeMat, markerMat]) m.dispose();
      stage.dispose();
    },
  };
}

/**
 * Walk from a door to a room in 3D (#67): floors pulled apart, low walls, the route and a marker that follows the steps.
 * Without WebGL the steps still work. Esc or "Back to map" calls onClose.
 */
export function Walkthrough({ indoor, roomId, onClose }) {
  const graph = useMemo(() => buildGraph(indoor), [indoor]);
  const [stepFree, setStepFree] = useState(false);
  const [door, setDoor] = useState(undefined); // entrance id; undefined is the main door
  const walk = useMemo(() => route(graph, door, roomId, { stepFree }), [graph, door, roomId, stepFree]);
  const list = useMemo(() => stepsOf(walk, indoor), [walk, indoor]);
  const line = useMemo(() => (walk.points.length ? walkLine(walk, list, indoor) : null), [walk, list, indoor]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  playingRef.current = playing;

  const host = useRef(null);
  const scene = useRef(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let gone = false;
    if (!hasWebGL()) {
      setNote(NO_WEBGL + " Here are the steps.");
      return undefined;
    }
    loadThree()
      .then((three) => {
        if (gone) return;
        scene.current = setup(three, host.current, { indoor, roomId });
        setReady(true);
      })
      .catch(() => !gone && setNote(NO_LOAD + " Here are the steps."));
    return () => {
      gone = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [indoor, roomId]);

  // A new route starts over at its first step.
  useEffect(() => {
    setAt(0);
    setPlaying(false);
    if (ready) scene.current?.setLine(line);
  }, [ready, line]);

  // Move to the current step; while playing, go on to the next one.
  useEffect(() => {
    if (!ready || !line) return undefined;
    let timer;
    scene.current?.goTo(line.stepEnds[at] ?? 0, () => {
      if (!playingRef.current) return;
      if (at < list.length - 1) timer = setTimeout(() => setAt((a) => Math.min(a + 1, list.length - 1)), PAUSE_MS);
      else setPlaying(false);
    });
    return () => clearTimeout(timer);
  }, [ready, line, at, list.length, playing]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const last = list.length - 1;
  const jump = (i) => { setPlaying(false); setAt(Math.max(0, Math.min(last, i))); };
  const room = walk.room?.name || `Room ${roomId}`;
  const entrances = indoor.floors.flatMap((f) => f.entrances || []);

  return (
    <div className="map-body">
      <div className="map-frame">
        <div ref={host} className="map-3d" tabIndex={0} role="application" aria-label={`3D walk to ${room} in ${indoor.name}. Drag to turn, scroll to zoom.`}>
          {note ? <p className="map-3d-wait t-small t-muted">{note}</p> : ready ? null : <p className="map-3d-wait t-small t-muted">Loading 3D…</p>}
        </div>
      </div>

      <Card className="map-side walk-side">
        <div className="walk-head">
          <h2 className="t-title">Walk to {room}</h2>
          <Button size="sm" onClick={onClose}>Back to map</Button>
        </div>
        <p className="t-small t-muted">{indoor.name}</p>

        <div className="ui-chips" role="group" aria-label="How to get in">
          <Chip filter pressed={stepFree} onClick={() => setStepFree((v) => !v)}>Step free</Chip>
          {entrances.map((e) => (
            <Chip key={e.id} filter pressed={(door ?? walk.from?.id) === e.id} onClick={() => setDoor(e.id)}>{e.name || e.id}</Chip>
          ))}
        </div>

        {walk.reason ? (
          <p role="status">{walk.reason}</p>
        ) : (
          <>
            <div className="walk-controls">
              <Button size="sm" aria-label="Back one step" disabled={at === 0} onClick={() => jump(at - 1)}>Back</Button>
              {playing ? (
                <Button size="sm" onClick={() => setPlaying(false)}>Pause</Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => { setAt(at >= last ? 0 : at + 1); setPlaying(true); }}>Play</Button>
              )}
              <Button size="sm" aria-label="Next step" disabled={at >= last} onClick={() => jump(at + 1)}>Next</Button>
            </div>
            <p className="vh" aria-live="polite">{list[at]?.text}</p>
            <ol className="walk-steps">
              {list.map((s, i) => (
                <li key={i}>
                  <button type="button" className={i === at ? "is-on" : ""} aria-current={i === at ? "step" : undefined} onClick={() => jump(i)}>
                    {s.text}
                  </button>
                </li>
              ))}
            </ol>
            <p className="t-small t-faint">About {feet(walk.meters)} feet{walk.floors.length > 1 ? `, ${walk.floors.length} floors` : ""}.</p>
          </>
        )}
      </Card>
    </div>
  );
}
