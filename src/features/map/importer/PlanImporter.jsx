import { useMemo, useState } from "react";
import { Button, Card } from "../../../components/ui/index.jsx";
import campus from "../campus.json";
import { findBuilding } from "../campusMap.js";
import { checkIndoor, toCampus } from "../indoor/indoorData.js";
import { svgToIndoor } from "./planImport.js";
import { readSvgLayers } from "./readSvg.js";

const VIEW = 160; // meters shown around the origin

/**
 * Dev screen (#/dev/plan, #62): an Inkscape trace (docs/map-3d/tracing.md) to an indoor JSON file.
 * Reads the SVG in this page only, shows it on the campus map to line up origin and rotation, checks it, saves it.
 */
export function PlanImporter() {
  const [file, setFile] = useState(null); // { name, layers, errors }
  const [fields, setFields] = useState({ building: "", name: "", x: 0, y: 0, rotation: 0, floorHeight: 4 });
  const [find, setFind] = useState("");
  const set = (k) => (e) => {
    const v = e.target.type === "number" || e.target.type === "range" ? Number(e.target.value) : e.target.value;
    setFields((f) => ({ ...f, [k]: v }));
  };

  const open = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    try {
      setFile({ name: picked.name, ...readSvgLayers(await picked.text()) });
    } catch (err) {
      setFile({ name: picked.name, layers: [], errors: [err.message] });
    }
  };

  const pickBuilding = () => {
    const b = findBuilding(find, campus.buildings);
    if (b) setFields((f) => ({ ...f, building: b.id, name: b.name, x: b.c[0], y: b.c[1] }));
  };

  const result = useMemo(() => {
    if (!file?.layers.length) return null;
    const { building, name, x, y, rotation, floorHeight } = fields;
    const { data, notes } = svgToIndoor(file.layers, { building, name, origin: [x, y], rotation, floorHeight });
    return { data, notes, check: checkIndoor(data) };
  }, [file, fields]);

  const save = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2) + "\n"], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.data.building || "building"}.indoor.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ground = result?.data.floors[0];
  const poly = (pts, closed) =>
    pts.map((p) => toCampus(p, result.data)).map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(2)} ${py.toFixed(2)}`).join("") + (closed ? "Z" : "");
  const near = campus.buildings.filter((b) => Math.abs(b.c[0] - fields.x) < VIEW && Math.abs(b.c[1] - fields.y) < VIEW);
  const problems = [...(file?.errors || []), ...(result?.notes || []), ...(result?.check.problems || [])];

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="t-display">Floor plan importer</h1>
        <p className="page-sub">Dev tool. Turns an Inkscape trace into an indoor file. The file stays on this computer.</p>
      </header>

      <Card aria-labelledby="plan-in">
        <h2 id="plan-in" className="t-heading">1. Pick the trace</h2>
        <label className="set-field">
          <span>SVG file (see docs/map-3d/tracing.md)</span>
          <input type="file" accept=".svg,image/svg+xml" onChange={open} />
        </label>
        {file ? <p className="t-small t-muted">{file.name}: {file.layers.length} layers.</p> : null}
      </Card>

      <Card aria-labelledby="plan-where">
        <h2 id="plan-where" className="t-heading">2. Put it on the map</h2>
        <div className="set-field">
          <span>Building on the campus map</span>
          <div className="ui-chips">
            <input className="ui-input" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Like Bidgood Hall" aria-label="Building on the campus map" />
            <Button size="sm" onClick={pickBuilding}>Use it</Button>
          </div>
        </div>
        <label className="set-field"><span>Building id</span><input className="ui-input" value={fields.building} onChange={set("building")} /></label>
        <label className="set-field"><span>Name</span><input className="ui-input" value={fields.name} onChange={set("name")} /></label>
        <div className="ui-chips">
          <label className="set-field"><span>Origin x (m east)</span><input className="ui-input" type="number" step="0.5" value={fields.x} onChange={set("x")} /></label>
          <label className="set-field"><span>Origin y (m south)</span><input className="ui-input" type="number" step="0.5" value={fields.y} onChange={set("y")} /></label>
          <label className="set-field"><span>Floor height (m)</span><input className="ui-input" type="number" step="0.1" min="1" value={fields.floorHeight} onChange={set("floorHeight")} /></label>
        </div>
        <label className="set-field">
          <span>Rotation: {fields.rotation}°</span>
          <input type="range" min="-180" max="180" step="0.5" value={fields.rotation} onChange={set("rotation")} />
        </label>
        {ground ? (
          <>
            <svg className="plan-preview" viewBox={`${fields.x - VIEW / 2} ${fields.y - VIEW / 2} ${VIEW} ${VIEW}`} role="img" aria-label={`${fields.name || "The building"} drawn over the campus map`}>
              {near.map((b) => <path key={b.id} d={b.path} className="plan-campus" />)}
              {ground.outline.length ? <path d={poly(ground.outline, true)} className="plan-outline" /> : null}
              {ground.rooms.map((r) => <path key={r.id} d={poly(r.outline, true)} className="plan-room" />)}
              {ground.walk.map((l, i) => <path key={i} d={poly(l, false)} className="plan-walk" />)}
            </svg>
            <p className="t-small t-muted">Gray is the campus map. Red is your ground floor. Move the origin and turn it until they line up.</p>
          </>
        ) : null}
      </Card>

      {result ? (
        <Card aria-labelledby="plan-check">
          <h2 id="plan-check" className="t-heading">3. Check and save</h2>
          <p className="t-small">{result.data.floors.length} floors, {result.data.floors.reduce((s, f) => s + f.rooms.length, 0)} rooms.</p>
          {problems.length ? <ul className="t-small">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p className="t-small">No problems found.</p>}
          <div>
            <Button variant="primary" onClick={save}>{result.check.ok ? "Save indoor file" : "Save anyway"}</Button>
          </div>
          <p className="t-small t-muted">Put the saved file in Settings, Indoor maps on this computer. Never commit it (rule 14).</p>
        </Card>
      ) : null}
    </div>
  );
}
