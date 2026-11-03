import { useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";

/** Blackboard ids of the student's organizations (clubs, "Bama Bound"). The sync saves them in the `bb.orgs` setting. */
export function useOrgIds() {
  const [ids, setIds] = useState([]);
  useEffect(() => {
    const load = () =>
      courseStore.getSetting("bb.orgs").then((v) => {
        try {
          setIds(JSON.parse(v) || []);
        } catch {
          setIds([]);
        }
      });
    void load();
    window.addEventListener("studyhub-mirror-changed", load);
    return () => window.removeEventListener("studyhub-mirror-changed", load);
  }, []);
  return ids;
}
