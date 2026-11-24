/**
 * Contact fields on Profile (#214): the email and phone a club newsletter would use. Pure checks, no network.
 * Both are optional to save; a newsletter asks for the email when you subscribe (#216).
 */

export const EMAIL_HELP = "Check the email. It should look like name@crimson.ua.edu.";
export const PHONE_HELP = "Check the phone number. Use 10 digits, like 205-555-0142.";

/** Null when the email is fine or empty, else a short message. */
export function checkEmail(text) {
  const s = String(text ?? "").trim();
  if (!s) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? null : EMAIL_HELP;
}

const digitsOf = (text) => {
  const s = String(text ?? "").trim();
  if (/[a-z]/i.test(s)) return null;
  const d = s.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};

/** Null when the phone is fine or empty, else a short message. US numbers only. */
export function checkPhone(text) {
  if (!String(text ?? "").trim()) return null;
  const d = digitsOf(text);
  return d && d.length === 10 ? null : PHONE_HELP;
}

/** "(205) 555-0142" → "205-555-0142". Empty stays empty. Only call after checkPhone passes. */
export function cleanPhone(text) {
  const d = digitsOf(text);
  return d && d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : "";
}
