import campus from "./campus.json";
import demoHall from "../../demo/indoor/demo-hall.indoor.json";
import { footprint } from "./indoor/indoorData.js";

// Demo Hall is made up (rule 14), so it is on the map in Demo mode only.
const isLive = typeof window !== "undefined" && window.studyHub?.mode === "live";

/** Buildings drawn on the map: campus.json, plus Demo Hall in Demo mode. */
export const BUILDINGS = isLive ? campus.buildings : [...campus.buildings, footprint(demoHall)];
/** Everything a place name can match: buildings and named areas like the Quad. */
export const PLACES = [...BUILDINGS, ...campus.areas];
