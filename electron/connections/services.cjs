/**
 * Every connection the app knows (CLAUDE.md rule 5). Off until the student turns one on.
 * Names and the "reads / sends" lines live in services.json, which the demo bridge shows too.
 * `ready: false` rows show in Settings as "Coming later" and cannot be connected yet.
 * HOSTS lists the sites a service's sign-in window may show; anything else opens in the browser.
 */
const LIST = require("./services.json");

const HOSTS = {
  mybama: [/(^|\.)ua\.edu$/i, /(^|\.)okta\.com$/i, /(^|\.)duosecurity\.com$/i],
};

const SERVICES = LIST.map((s) => ({ ...s, hosts: HOSTS[s.id] || [] }));
const byId = (id) => SERVICES.find((s) => s.id === id) || null;
const partitionOf = (id) => `persist:conn-${id}`;

/** True when `url` is https and on one of the service's sign-in hosts. */
function allowedHost(service, url) {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "https:" && (service.hosts || []).some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

module.exports = { SERVICES, byId, partitionOf, allowedHost };
