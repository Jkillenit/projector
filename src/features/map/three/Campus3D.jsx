import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/index.jsx";
import campus from "../campus.json";
import { extrudeRings, pathToRings } from "./extrude.js";
import { BOWL, BOWL_PARTS, fieldUV, markedFields, parkingLots, stadiumBowl, stallFade, underBowl } from "./fields.js";
import { addDashes, addRibbons, CURB, GROUND_LAYERS, isDeck, isLandmark, MAIN_ROADS, mergeBuildings, PATH_WIDTH, roadWidth, roofTone } from "./campusMesh.js";
import { blend, cameraFrom, clipFor, distanceFor, MODES, poseFor, poseOf, SIZE_RANGE, viewFor } from "./camera.js";
import { footprint, labelBox, thinLabels } from "./labels.js";
import { BRICK, FIELD_LOOKS, fieldCanvas, meanTone, textureCanvas, TILE, worldUV } from "./textures.js";
import { groundShade, shaded } from "./shade.js";
import { createStage, hasWebGL, loadThree, NO_LOAD, NO_WEBGL, token } from "./stage.js";
import { insideOf, placeTrees, seeded } from "./trees.js";
import { roofOf } from "./roofs.js";
import { shadowOffset } from "./quality.js";
import { seedOf } from "../campusMap.js";
import { isReducedMotion } from "../../../shell/motion.js";

const FLY_MS = 1500;
const MODE_MS = 700;
const TO_2D = " Showing the flat map instead.";
const PIN = 28; // pin size on screen, px, as in ui.css
const CLASS_SHIFT = -16; // class pins sit up and left of the spot, so a class and an event in one building do not cover each other
const STADIUM = { name: "Bryant-Denny Stadium", field: "Saban Field" }; // the one bowl (#150)
const FADE = { near: 0.3, far: 1.1 }; // #179: texture detail fades out as a pixel grows from near to far meters
const MACRO = { grass: 0.09, water: 0.07, asphalt: 0.05, concrete: 0.03 }; // big soft patches on the ground, by texture
const BASE = { dark: 0.72, height: 7 }; // walls are darker where they meet the ground
const QUIET = { h: 8, labels: 800 }; // #165: the town outside campus: walls no taller than this (m); names only when the view is this narrow (m)

/** Builds the scene once. Returns { setPicked, setPins, setMode, fly, zoom, reset, dispose }. */
function setup(three, host, { buildings, center, mode: firstMode, nature, onPick }) {
  const stage = createStage(three, host, { outdoor: true, theme: () => theme(), overlay: (size) => overlay(size) });
  const { THREE, camera, controls, render, add, geometry, solid, renderer, shadows } = stage;
  controls.screenSpacePanning = false; // pan along the ground, so 2.5D and 3D never lift off it
  let mode = firstMode;

  // Textures made in code (#121), one per kind for this scene, tinted by each layer's token.
  const textures = {};
  const texture = (kind) => {
    if (!textures[kind]) {
      const t = new THREE.CanvasTexture(textureCanvas(kind));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); // stays crisp when 2.5D tilts it away
      textures[kind] = t;
    }
    return textures[kind];
  };

  // The ground: flat layers drawn bottom first, without depth, so they never flicker against each other.
  // shortcut: the river line is left out, the water outlines already cover it; draw it if a gap shows.
  const flat = (geo, order, kind) => {
    geo.setAttribute("uv", new THREE.BufferAttribute(worldUV(geo.attributes.position.array, TILE[kind]), 2));
    // #179: grain fades to the tile's flat tone from far away, and big soft patches keep lawns and lots from looking tiled.
    const mat = shaded(new THREE.MeshLambertMaterial({ map: texture(kind), depthWrite: false, side: THREE.DoubleSide }), { detail: { mean: meanTone(textureCanvas(kind)), ...FADE }, macro: MACRO[kind] });
    const m = add(new THREE.Mesh(geo, mat));
    m.renderOrder = order - 100;
    m.position.y = order * 0.05;
    m.receiveShadow = true;
    return m;
  };
  const [x0, y0, x1, y1] = campus.bounds;
  const [cx, cz, far] = [(x0 + x1) / 2, (y0 + y1) / 2, 10000];
  const ground = flat(geometry([cx - far, 0, cz - far, cx + far, 0, cz - far, cx + far, 0, cz + far, cx - far, 0, cz + far], [0, 2, 1, 0, 3, 2]), -1, "asphalt");
  const ribbons = (name) => {
    const s = { positions: [], indices: [] };
    if (name === "paths") addRibbons(s, nature.paths, PATH_WIDTH);
    else for (const [type, d] of Object.entries(nature.roads)) addRibbons(s, d, roadWidth(type));
    return geometry(s.positions, s.indices);
  };
  const SKIN = { campus: "grass", wood: "grass", grass: "grass", pitch: "grass", water: "water", parking: "asphalt", roads: "asphalt", paths: "concrete" };
  const layers = GROUND_LAYERS.map((name, i) => {
    const geo = name === "roads" || name === "paths" ? ribbons(name) : solid(pathToRings(nature[name]), 0.01, { walls: false });
    const m = flat(geo, i, SKIN[name]);
    m.userData.token = `--map-${{ roads: "road", paths: "path" }[name] || name}`;
    return m;
  });
  // Main roads (#169): a light curb edge under the road, and a dashed center line on it that fades out from far away (with the stalls).
  const centerLine = (() => {
    const [curb, dash] = [{ positions: [], indices: [] }, { positions: [], indices: [] }];
    for (const type of MAIN_ROADS) {
      addRibbons(curb, nature.roads[type], roadWidth(type) + CURB * 2);
      addDashes(dash, nature.roads[type]);
    }
    const edge = flat(geometry(curb.positions, curb.indices), GROUND_LAYERS.indexOf("roads") - 0.5, "concrete");
    edge.userData.token = "--map-path";
    layers.push(edge);
    const line = flat(geometry(dash.positions, dash.indices), GROUND_LAYERS.indexOf("roads") + 0.5, "concrete");
    line.userData.token = "--map-line";
    line.material.transparent = true;
    layers.push(line);
    return line;
  })();
  // Bryant-Denny's own outline in OSM is replaced by the bowl below (#150).
  const stadiumArea = campus.areas.find((a) => a.name === STADIUM.name);
  const stadiumRing = stadiumArea && pathToRings(stadiumArea.path)[0];
  // The town outside the campus edge stays quiet (#165): low, plain and pale, so campus stands out.
  const onCampus = insideOf(nature.campus);
  const low = (b) => (b.quiet ? { ...b, h: Math.min(b.h || 0, QUIET.h) } : b);
  const outlines = (stadiumRing ? nature.outlines.filter((o) => !underBowl(o.path, stadiumRing)) : nature.outlines)
    .map((o) => low({ ...o, quiet: !onCampus(pathToRings(o.path)[0]?.[0] || []) }));
  buildings = buildings.map((b) => low({ ...b, quiet: !onCampus(b.c), roofShape: nature.looks?.[b.id]?.roofShape }));

  // Sports fields (#150): one mesh per look just over the plain pitch. Textures are painted in theme colors, in theme().
  const fieldMeshes = [];
  {
    const order = GROUND_LAYERS.indexOf("pitch") + 0.5;
    const tracks = campus.areas.filter((a) => /track/i.test(a.name)).map((a) => pathToRings(a.path)[0]);
    const all = markedFields(nature, { stadium: stadiumRing, tracks });
    for (const look of FIELD_LOOKS) {
      const s = { positions: [], indices: [], uvs: [] };
      for (const f of all) {
        if (f.look !== look) continue;
        for (const shape of f.shape ? [f.shape] : extrudeRings([f.ring], 0.01, { walls: false })) {
          const base = s.positions.length / 3;
          s.positions.push(...shape.positions);
          s.indices.push(...shape.indices.map((i) => base + i));
          s.uvs.push(...(f.uv || (f.frame ? fieldUV(shape.positions, f.frame, look) : new Array((shape.positions.length / 3) * 2).fill(0))));
        }
      }
      if (!s.indices.length) continue;
      const geo = geometry(s.positions, s.indices);
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(s.uvs, 2));
      const m = add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ depthWrite: false, side: THREE.DoubleSide, transparent: look === "stalls" })));
      Object.assign(m, { renderOrder: order - 100, receiveShadow: true });
      m.position.y = order * 0.05;
      m.userData.look = look;
      fieldMeshes.push(m);
    }
  }
  // Bryant-Denny (#150): a bowl that hugs the field, tappable as the stadium. One material per part (seats, suites, walls...).
  const bowl = (() => {
    const field = campus.areas.find((a) => a.name === STADIUM.field);
    const shape = stadiumRing && field && stadiumBowl(stadiumRing, pathToRings(field.path)[0]);
    if (!shape) return null;
    const indices = BOWL_PARTS.flatMap((p) => shape.groups[p]);
    const geo = geometry(shape.positions, indices);
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(shape.uvs, 2));
    let at = 0;
    BOWL_PARTS.forEach((p, k) => {
      geo.addGroup(at, shape.groups[p].length, k);
      at += shape.groups[p].length;
    });
    const mats = BOWL_PARTS.map(() => new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
    const m = add(new THREE.Mesh(geo, mats));
    m.castShadow = m.receiveShadow = true;
    m.userData = { id: stadiumArea.id, merged: { triOwner: new Array(indices.length / 3).fill(stadiumArea.id) } };
    return m;
  })();
  const BOWL_TOKENS = { suite: "--map-road", wall: "--map-context", base: "--map-brick", pad: "--map-landmark", roof: "--map-path", board: "--map-road" }; // #164: light wall, white rim

  // Buildings (#122): brick walls with a window per bay and floor, textured roofs. Walls and roofs are two groups of one mesh,
  // so tapping (#118) still finds the building. OSM's building:colour and roof:colour win over our defaults.
  // #179, #143: from far away windows fade into plain brick (not the muddy brown their dark glass averages to) and roof seams into the roof.
  const wallMat = shaded(new THREE.MeshLambertMaterial({ map: texture("brick"), vertexColors: true }), { detail: { mean: 0.72, near: 0.6, far: 1.8 }, base: BASE });
  const roofMat = shaded(new THREE.MeshLambertMaterial({ map: texture("roof"), vertexColors: true }), { detail: { mean: meanTone(textureCanvas("roof")), ...FADE } });
  const deckMat = shaded(new THREE.MeshLambertMaterial({ map: texture("deck"), vertexColors: true }), { base: BASE }); // #146: concrete bands
  const looks = new Map();
  const buildingMesh = (list, mats = [wallMat, roofMat, deckMat]) => {
    const merged = mergeBuildings(list);
    const geo = geometry(merged.positions, merged.indices);
    const scale = (i) => (merged.isRoof[i >> 1] ? TILE.roof : i % 2 ? BRICK.floor : BRICK.bay);
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(merged.uvs.map((x, i) => x / scale(i)), 2));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(merged.positions.length), 3));
    geo.addGroup(0, merged.wallIndices - merged.deckIndices, 0);
    geo.addGroup(merged.wallIndices - merged.deckIndices, merged.deckIndices, 2);
    geo.addGroup(merged.wallIndices, merged.indices.length - merged.wallIndices, 1);
    const mesh = add(new THREE.Mesh(geo, mats));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.merged = merged;
    return mesh;
  };
  // Unnamed buildings: not tappable, so their roofs are grayer than named ones.
  const unnamed = outlines.map((o, i) => {
    looks.set(`o${i}`, o);
    return { id: `o${i}`, path: o.path, h: o.h, quiet: o.quiet, roofShape: o.roofShape };
  });
  for (const b of buildings) looks.set(b.id, { ...nature.looks?.[b.id], landmark: isLandmark(b.name), deck: isDeck(b.name), flat: roofOf({ ...b, plain: b.quiet || isDeck(b.name) }) === "flat" });
  const context = buildingMesh(unnamed.filter((b) => !b.quiet));
  const town = buildingMesh(buildings.filter((b) => !b.quiet));
  // Off campus: no brick or windows, no cast shadow, one plain material. Named ones are still tappable.
  const plainMat = shaded(new THREE.MeshLambertMaterial({ vertexColors: true }), { base: BASE });
  const quiet = buildingMesh([...unnamed, ...buildings].filter((b) => b.quiet).map((b) => ({ ...b, name: "" })), [plainMat, plainMat, plainMat]);
  quiet.castShadow = false;

  // Trees (#123, #168): three lumpy crowns (round, wide like an oak, tall) and a trunk, one InstancedMesh each, so one draw call per model.
  // Crowns start from --map-tree, so seasons (#128) can turn them; each tree gets its own green (leafTint).
  // Not in the tap list, so a tap goes through a tree to the building behind it.
  const groves = campus.areas.filter((a) => /quad/i.test(a.name)).flatMap((a) => pathToRings(a.path)); // dense under big trees
  const trees = placeTrees(nature, buildings, campus.bounds, groves);
  const CROWN = [3.2, 4.8, 6.8]; // crown radius by size, meters
  const TRUNK = [3, 4, 5];
  const CROWN_FORM = [[1, 0.8], [1.2, 0.62], [0.82, 1.1]]; // wide and tall, as a share of the radius
  const crownMat = shaded(new THREE.MeshLambertMaterial(), { crown: { dark: 0.62, light: 1.1 } }); // #179: darker underneath
  const trunkMat = new THREE.MeshLambertMaterial();
  const crownShape = (k) => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // A bump per corner, keyed by where the corner is, so faces that share it stay joined.
      const lump = 0.85 + 0.3 * seeded(seedOf(`${k}:${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`))();
      p.setXYZ(i, p.getX(i) * lump * CROWN_FORM[k][0], p.getY(i) * lump * CROWN_FORM[k][1], p.getZ(i) * lump * CROWN_FORM[k][0]);
    }
    geo.setAttribute("normal", new THREE.BufferAttribute(Float32Array.from(p.array), 3)); // soft, like a ball of leaves: light falls off evenly, no facets
    geo.normalizeNormals();
    return geo;
  };
  const crowns = CROWN_FORM.map((_, k) => add(new THREE.InstancedMesh(crownShape(k), crownMat, Math.ceil((trees.length - k) / CROWN_FORM.length))));
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1, 5, 1, true).translate(0, 0.5, 0);
  const trunks = add(new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length));
  {
    const o = new THREE.Object3D();
    const r = seeded(seedOf("tree looks"));
    trees.forEach(([x, z, s], i) => {
      const [crown, trunk, turn] = [CROWN[s] * (0.8 + r() * 0.45), TRUNK[s], r() * Math.PI * 2];
      o.position.set(x, 0, z);
      o.rotation.set(0, turn, 0);
      o.scale.set(1, trunk, 1);
      o.updateMatrix();
      trunks.setMatrixAt(i, o.matrix);
      o.position.y = trunk + crown * 0.6;
      o.scale.setScalar(crown);
      o.updateMatrix();
      crowns[i % crowns.length].setMatrixAt(Math.floor(i / crowns.length), o.matrix);
    });
  }
  // Each tree's own green: the token turned a little toward yellow or blue, fuller or grayer, lighter or darker. Seeded, so it never changes.
  const leafTint = () => {
    const base = new THREE.Color(token("--map-tree"));
    const [r, c] = [seeded(seedOf("tree colors")), new THREE.Color()];
    trees.forEach((_, i) => {
      const m = crowns[i % crowns.length];
      m.setColorAt(Math.floor(i / crowns.length), c.copy(base).offsetHSL((r() - 0.6) * 0.09, (r() - 0.5) * 0.2, (r() - 0.5) * 0.14));
      m.instanceColor.needsUpdate = true;
    });
  };
  for (const m of [...crowns, trunks]) m.castShadow = true;

  // Ambient shade (#179): a soft dark edge on the ground around every building, in every view and on both tiers.
  {
    const s = groundShade([...buildings, ...outlines, ...(bowl ? [{ path: stadiumArea.path }] : [])].flatMap((b) => pathToRings(b.path)));
    const geo = geometry(s.positions, s.indices);
    geo.setAttribute("color", new THREE.Float32BufferAttribute(s.colors, 4));
    const m = add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })));
    m.renderOrder = GROUND_LAYERS.length - 100;
    m.position.y = GROUND_LAYERS.length * 0.05;
  }

  // Low tier (phones, #124): no shadow map, a soft dark patch under each building and tree, pushed the way shadows fall.
  if (!shadows) {
    const patch = (mesh) => {
      mesh.renderOrder = GROUND_LAYERS.length - 100;
      mesh.position.y = GROUND_LAYERS.length * 0.05;
      return add(mesh);
    };
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
    const rings = [];
    for (const b of [...buildings, ...outlines, ...(bowl ? [{ path: stadiumArea.path, h: BOWL.top }] : [])]) {
      const [dx, dz] = shadowOffset(Math.min(b.h || 0, 40) * 0.5);
      for (const r of pathToRings(b.path)) rings.push(r.map(([x, z]) => [x + dx, z + dz]));
    }
    patch(new THREE.Mesh(solid(rings, 0.01, { walls: false }), shadeMat));
    const blobs = patch(new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), shadeMat, trees.length));
    const o = new THREE.Object3D();
    trees.forEach(([x, z, s], i) => {
      const [dx, dz] = shadowOffset(TRUNK[s] + CROWN[s] * 0.6);
      o.position.set(x + dx * 0.5, 0, z + dz * 0.5);
      o.scale.setScalar(CROWN[s] * 0.9);
      o.updateMatrix();
      blobs.setMatrixAt(i, o.matrix);
    });
  }

  // Tappable shapes: one mesh each, colored per vertex (RGBA) so one place can light up. Areas are a thin see-through tint.
  const tappable = (places, h, size, material) => {
    const merged = mergeBuildings(places.map((p) => ({ id: p.id, path: p.path, h: h ?? p.h })));
    const geo = geometry(merged.positions, merged.indices);
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array((merged.positions.length / 3) * size), size));
    const mesh = add(new THREE.Mesh(geo, material));
    mesh.userData.merged = merged;
    return mesh;
  };
  // The bowl stands in for the stadium (#150); its flat tint would fight the field's.
  const areas = tappable(bowl ? campus.areas.filter((a) => a !== stadiumArea) : campus.areas, 0.3, 4, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
  const edges = add(new THREE.LineSegments(new THREE.EdgesGeometry(town.geometry, 30), new THREE.LineBasicMaterial()));

  // Pins and names are HTML over the scene (#119): sharp text, a steady size on screen, buttons for keyboard and screen readers.
  const { CSS2DObject } = three;
  const pinGroup = add(new THREE.Group());
  const labelGroup = add(new THREE.Group());
  for (const p of [...buildings, ...campus.areas]) {
    const el = document.createElement("div");
    el.className = "map-3d-label";
    el.textContent = p.name;
    const o = new CSS2DObject(el);
    const h = bowl && p === stadiumArea ? BOWL.top : p.h; // the stadium's name sits on its rim, and wins like a building
    o.position.set(p.c[0], (h || 0) + 2, p.c[1]);
    o.userData = { id: p.id, name: p.name, quiet: p.quiet, rank: footprint(p.path) * (p.quiet ? 0.001 : h ? 1 : 0.05) }; // areas give way to buildings, the town to both
    labelGroup.add(o);
  }

  let picked = null;
  let hovered = null;
  const color = (css, fallback) => {
    const c = new THREE.Color(fallback);
    if (css) c.setStyle(css); // an unknown OSM color leaves the default
    return c;
  };
  const paintBuildings = (mesh, on, near) => {
    const attr = mesh.geometry.attributes.color;
    const { owners, isRoof, isTrim } = mesh.userData.merged;
    const [brick, landmark] = [token("--map-brick"), token("--map-landmark")];
    const stone = new THREE.Color(token("--map-path")); // landmark columns (#130) and deck concrete (#146): light stone, like the paths
    const slates = mesh === town ? ["--map-slate-1", "--map-slate-2", "--map-slate-3"].map(token) : [token("--map-context")];
    const pale = new THREE.Color(token("--map-context"));
    for (const o of owners) {
      const look = mesh === quiet ? {} : looks.get(o.id);
      const lit = o.id === picked ? on : o.id === hovered ? near : mesh === quiet ? pale : null;
      const wall = lit || color(look.colour, look.landmark ? landmark : look.deck ? stone : brick);
      const roof = lit || color(look.roof, look.flat ? pale.getStyle() : slates[roofTone(o.id, slates.length)]); // #166: big flat roofs are a light membrane
      const trim = lit || stone;
      for (let v = o.start; v < o.end; v++) (isTrim[v] ? trim : isRoof[v] ? roof : wall).toArray(attr.array, v * 3);
    }
    attr.needsUpdate = true;
  };
  const paint = (all) => {
    const on = new THREE.Color(token("--map-pick"));
    const near = new THREE.Color(token("--map-hover"));
    paintBuildings(town, on, near);
    paintBuildings(quiet, on, near);
    if (all) paintBuildings(context);
    if (bowl) {
      const id = bowl.userData.id;
      const lit = id === picked ? on : id === hovered ? near : null;
      BOWL_PARTS.forEach((p, k) => bowl.material[k].color.set(lit || (p === "seat" || p === "bench" ? 0xffffff : token(BOWL_TOKENS[p]))));
    }
    for (const [mesh, base, alpha] of [[areas, new THREE.Color(token("--map-grass")), 0.25]]) {
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
    edges.material.color.set(token("--map-roof"));
    leafTint();
    const pitch = new THREE.Color(token("--map-pitch"));
    const colors = {
      pitch: `#${pitch.getHexString()}`, stripe: `#${pitch.clone().offsetHSL(0, 0, 0.035).getHexString()}`, line: token("--map-line"), dirt: token("--map-dirt"),
      track: token("--map-track"), endzone: token("--map-landmark"), seat: token("--map-landmark"), aisle: token("--map-context"),
    };
    for (const m of fieldMeshes) {
      m.material.map?.dispose();
      const t = new THREE.CanvasTexture(fieldCanvas(m.userData.look, colors));
      const tiles = ["court", "track", "stalls"].includes(m.userData.look);
      t.wrapS = t.wrapT = tiles ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      m.material.map = t;
      m.material.needsUpdate = true;
    }
    if (bowl) {
      // Crimson chairbacks and grey aluminum bleachers: one seat tile, two colors.
      for (const [part, seat] of [["seat", colors.seat], ["bench", token("--map-slate-2")]]) { // gray, not the blue slate
        const seats = bowl.material[BOWL_PARTS.indexOf(part)];
        seats.map?.dispose();
        seats.map = new THREE.CanvasTexture(fieldCanvas("seats", { ...colors, seat }));
        Object.assign(seats.map, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, colorSpace: THREE.SRGBColorSpace, anisotropy: renderer.capabilities.getMaxAnisotropy() });
        seats.needsUpdate = true;
      }
    }
    trunkMat.color.set(token("--map-trunk"));
    paint(true);
  }

  // Before each draw of the HTML layer: show the names that fit, never on a pin.
  const v = new THREE.Vector3();
  const onScreen = (o, size) => {
    v.copy(o.position).project(camera);
    return v.z > 1 ? null : [((v.x + 1) / 2) * size.w, ((1 - v.y) / 2) * size.h];
  };
  function overlay(size) {
    const view = poseOf({ position: camera.position.toArray(), target: controls.target.toArray() }, camera.fov).size;
    const stalls = fieldMeshes.find((m) => m.userData.look === "stalls");
    if (stalls) stalls.material.opacity = stallFade(view);
    centerLine.material.opacity = stallFade(view) * 0.8;
    // The zoom buttons and the OSM credit sit over the map too; names stay clear of them.
    const box = host.getBoundingClientRect();
    const pinBoxes = [...host.parentElement.querySelectorAll(".map-zoom, .map-credit")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
    });
    for (const o of pinGroup.children) {
      const at = onScreen(o, size);
      if (at) pinBoxes.push({ x: at[0] + o.userData.shift - PIN / 2, y: at[1] + o.userData.shift - PIN / 2, w: PIN, h: PIN });
    }
    const items = [];
    for (const o of labelGroup.children) {
      const at = onScreen(o, size);
      if (at && (!o.userData.quiet || view < QUIET.labels || o.userData.id === picked)) items.push({ id: o.userData.id, box: labelBox(o.userData.name, at[0], at[1]), rank: o.userData.id === picked ? Infinity : o.userData.rank });
    }
    const shown = thinLabels(items, pinBoxes, size);
    for (const o of labelGroup.children) {
      o.visible = shown.has(o.userData.id);
      o.element.classList.toggle("is-on", o.userData.id === picked);
    }
  }

  // What is under the pointer: a building or area id, or null. The nearest hit wins, so a building beats the area around it.
  const ray = new THREE.Raycaster();
  const under = (e) => {
    const box = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(bowl ? [town, quiet, areas, bowl] : [town, quiet, areas])[0];
    return hit ? hit.object.userData.merged.triOwner[hit.faceIndex] : null;
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
      pinGroup.clear(); // CSS2DObjects take their HTML with them
      const put = (p, className, label, shift) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = p.classes?.length || p.events.length;
        button.setAttribute("aria-label", label);
        button.style.margin = `${shift}px 0 0 ${shift}px`;
        button.addEventListener("click", () => onPick.current(p.key));
        const o = new CSS2DObject(button);
        o.position.set(p.xy[0], p.place?.h || 0, p.xy[1]);
        o.userData.shift = shift;
        pinGroup.add(o);
      };
      for (const p of classSpots) {
        const n = p.classes.length;
        put(p, `map-3d-pin is-class${p.classes.every((c) => c.session) ? " is-session" : ""}`, `Your ${n === 1 ? "class" : `${n} classes`} in ${p.place.name}`, CLASS_SHIFT);
      }
      for (const p of pins) {
        const n = p.events.length;
        put(p, "map-3d-pin", `${n} ${n === 1 ? "event" : "events"} at ${p.place?.name || p.events[0].where}`, 0);
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
      for (const t of [...Object.values(textures), wallMat, roofMat, deckMat, plainMat, ...fieldMeshes.map((m) => m.material.map).filter(Boolean), ...(bowl ? bowl.material.flatMap((m) => [m, m.map].filter(Boolean)) : [])]) t.dispose();
      host.removeEventListener("keydown", onKey);
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
