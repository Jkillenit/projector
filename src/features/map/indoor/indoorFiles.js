import demoHall from "../../../demo/indoor/demo-hall.indoor.json";

// Own module so Home can use it without loading campus.json. Demo Hall is made up (rule 14): Demo mode only.
const isLive = typeof window !== "undefined" && window.studyHub?.mode === "live";

/** Indoor files we have (#60). Demo mode: Demo Hall. Live mode loads real ones from this computer later (#63). */
export const INDOOR = isLive ? [] : [demoHall];
