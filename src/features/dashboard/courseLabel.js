/** "202640-MIS-430-001" → "MIS 430". Anything that doesn't look like a Blackboard code is returned as-is. */
export function shortCourse(name) {
  const s = String(name || "").trim();
  const m = s.match(/^(?:\d{4,6}[A-Z]{0,2}[-_ ]+(?:[A-Z]{1,3}\.)?)?([A-Z]{2,5})[-_ ]?(\d{3,4}[A-Z]?)(?:[-_ ]+\d{1,4})?\b/);
  return m ? `${m[1]} ${m[2]}` : s;
}

const CODE_PREFIX = /^(?:\d{4,6}[A-Z]{0,2}[-_ ]+(?:[A-Z]{1,3}\.)?)?[A-Z]{2,5}[-_ ]?\d{3,4}[A-Z]?(?:[-_ ]+\d{1,4})?\b[\s·:–-]*/;
const BARE_CODE = /^[A-Z]{2,5} \d{3,4}[A-Z]?$/;

/**
 * Friendly names for a course: { code: "MKT 300", title: "Digital & Social Media Marketing",
 * label: "MKT 300 · Digital & Social Media Marketing", raw: "202640-MKT-300-001" }.
 * The code comes from the Blackboard course ID, the title from the course name. `raw` is for tooltips only.
 */
export function friendlyCourse(course) {
  const id = String(course?.courseCode || "").trim();
  const name = String(course?.name || "").trim();
  const asCode = (s) => {
    const short = shortCourse(s);
    return short !== s || BARE_CODE.test(s) ? short : "";
  };
  const code = asCode(id) || asCode(name);
  const stripped = name.replace(CODE_PREFIX, "").trim();
  const title = stripped && stripped !== id ? stripped : asCode(name) ? "" : name;
  return { code, title, label: [code, title].filter(Boolean).join(" · ") || id, raw: [id, name].filter(Boolean).join(" · ") };
}
