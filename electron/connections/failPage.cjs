/** The page a connection window shows when a load fails. Pure, so it is tested without Electron. */
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Shown in the sign-in window when a page cannot load, so it never just sits blank. */
function failPage(url) {
  let host = "the site";
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep the plain words */
  }
  return `<!doctype html><meta charset="utf-8"><title>Could not load</title>
<body style="font:15px/1.5 system-ui,sans-serif;padding:40px;max-width:520px;color:#222">
<h2 style="margin:0 0 8px">Could not reach ${escapeHtml(host)}</h2>
<p>Check your internet connection, then try again. If it keeps happening, close this window and connect again.</p>
<p><a href="${escapeHtml(url)}">Try again</a></p></body>`;
}

module.exports = { failPage, escapeHtml };
