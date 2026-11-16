/** The short tag a course shows in the icon rail: its subject, up to 4 letters. "MATH 126" gives "MATH", "Bama Bound" gives "BAMA". */
export function railCode(label) {
  const word = String(label || "").trim().split(/\s+/)[0] || "";
  return word.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "?";
}
