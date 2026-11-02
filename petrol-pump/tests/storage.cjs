const assert = require("node:assert/strict"),
  C = require("../public/core"),
  S = require("../public/storage");
let raw = null;
const repo = S.create(
  () => ({ getItem: () => raw, setItem: (k, v) => (raw = v) }),
  C.KEY,
  C.valid,
);
assert.equal(repo.read().status, "missing");
let state = C.seed();
assert.equal(repo.write(state, null).status, "saved");
const first = raw;
state.revision++;
assert.equal(repo.write(state, first).status, "saved");
assert.equal(repo.write(C.seed(), first).status, "conflict");
raw = "{broken";
assert.equal(repo.read().status, "invalid");
assert.equal(repo.write(state, raw).status, "invalid");
assert.equal(raw, "{broken");
assert.equal(repo.write(state, raw, { replaceInvalid: true }).status, "saved");
const unavailable = S.create(
  () => {
    throw Error("blocked");
  },
  C.KEY,
  C.valid,
);
assert.equal(unavailable.read().status, "unavailable");
assert.equal(unavailable.write(state, null).status, "volatile");
for (const change of [
  (s) => s.sales[0].amount++,
  (s) => s.sales[0].closing++,
  (s) => s.sales.push(s.sales[0]),
  (s) => (s.audit[0].time = "invalid"),
  (s) => (s.customers[0].opening = 0.5),
  (s) => (s.tanks[0].capacity = 1),
]) {
  const broken = C.seed();
  change(broken);
  assert(!C.valid(broken));
  assert.throws(() => repo.write(broken, raw));
}
for (const amount of [true, null, "  ", "1e2", "1.001"])
  assert.throws(() =>
    C.apply(C.seed(), { role: "Owner", outlet: "all" }, "collect", {
      outlet: "central",
      customer: "central-fleet",
      method: "Bank",
      amount,
    }),
  );
assert.throws(
  () =>
    C.apply(C.seed(), { role: "Owner", outlet: "all" }, "task", {
      outlet: "central",
      expectedRevision: 10,
      title: "Test",
      due: C.DAY,
    }),
  /out of date/,
);
console.log(
  "PASS storage conflicts, corrupt-data preservation, explicit recovery, blocked storage, ledger invariants and decimal precision",
);
