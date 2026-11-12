import { useEffect, useState } from "react";
import { loadIndoor } from "./indoor/indoorFiles.js";

/** Buildings we have the inside of: `{ loaded, buildings, skipped }`. `fresh` reads the folder again. */
export function useIndoor({ fresh = false } = {}) {
  const [state, setState] = useState({ loaded: false, buildings: [], skipped: [] });
  useEffect(() => {
    let live = true;
    void loadIndoor({ fresh }).then((r) => live && setState({ loaded: true, ...r }));
    return () => {
      live = false;
    };
  }, [fresh]);
  return state;
}
