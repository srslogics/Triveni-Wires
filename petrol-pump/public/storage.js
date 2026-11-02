(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ForecourtStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Optimistic conflict detection for a local demo. A server/database must provide
  // atomic concurrency control for a production, multi-user ledger.
  function create(getStorage, key, validate) {
    function read() {
      let raw;
      try {
        raw = getStorage().getItem(key);
      } catch {
        return { status: "unavailable", raw: null };
      }
      if (raw === null) return { status: "missing", raw: null };
      try {
        const state = JSON.parse(raw);
        if (validate(state)) return { status: "ok", raw, state };
      } catch {}
      return { status: "invalid", raw };
    }
    function write(state, expectedRaw, { replaceInvalid = false } = {}) {
      if (!validate(state))
        throw new Error(
          "The workspace failed its integrity checks. Nothing was saved.",
        );
      const current = read();
      if (current.status === "invalid" && !replaceInvalid)
        return { ...current, status: "invalid" };
      if (current.status !== "unavailable" && current.raw !== expectedRaw)
        return { ...current, status: "conflict" };
      const raw = JSON.stringify(state);
      try {
        getStorage().setItem(key, raw);
        return { status: "saved", raw };
      } catch {
        return { status: "volatile", raw: current.raw };
      }
    }
    return { read, write };
  }
  return { create };
});
