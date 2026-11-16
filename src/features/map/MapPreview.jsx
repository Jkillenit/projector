import { routeHref } from "../../shell/useRoute.js";
import campus from "./campus.json";
import { BUILDINGS } from "./places.js";

const QUAD = campus.areas.find((a) => a.name === "The Quad")?.c || [0, 0];
const W = 1400;
const H = 1600;

/** Home's campus map card: the flat map around the Quad, no pan or zoom. The whole card opens the map page. */
export function MapPreview() {
  return (
    <a className="ui-card home-map" href={routeHref("map")} aria-labelledby="map-h">
      <span className="home-map-frame">
        <svg className="home-map-svg" viewBox={`${QUAD[0] - W / 2} ${QUAD[1] - H / 2} ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
          {campus.campus && <path className="map-campus" d={campus.campus} />}
          {campus.areas.map((a) => <path key={a.id} className="map-area" d={a.path} />)}
          <path className="map-road" d={campus.roads} style={{ strokeWidth: 6 }} />
          <path className="map-context" d={campus.context} />
          {BUILDINGS.map((b) => <path key={b.id} className="map-bldg" d={b.path} />)}
          <text className="map-label" x={QUAD[0]} y={QUAD[1]} fontSize={44} textAnchor="middle">The Quad</text>
        </svg>
        <span className="home-map-credit">{campus.credit}</span>
      </span>
      <span className="home-map-foot">
        <span className="home-map-text">
          <span id="map-h" className="t-heading">Campus map</span>
          <span className="t-small t-muted">Find buildings, your classes and today's events.</span>
        </span>
        <span className="ui-link">Open map</span>
      </span>
    </a>
  );
}
