const assert = require("node:assert/strict"),
  C = require("../public/core");
let count = 0;
const owner = { role: "Owner", outlet: "all" },
  manager = { role: "Manager", outlet: "central" },
  accountant = { role: "Accountant", outlet: "central" };
const test = (name, fn) => {
  fn();
  count++;
  console.log("PASS " + name);
};
const run = (s, action, data, ctx = owner) =>
  C.apply(s, ctx, action, { outlet: "central", ...data }).state;
test("Seed reconciles across all three outlets", () => {
  const s = C.seed();
  assert(C.valid(s));
  const all = C.metrics(s, owner),
    parts = s.outlets.map((o) => C.metrics(s, { ...owner, outlet: o.id }));
  for (const key of [
    "sales",
    "litres",
    "margin",
    "expenses",
    "stock",
    "credit",
    "cash",
    "variance",
    "low",
  ])
    assert.equal(C.round(parts.reduce((n, x) => n + x[key], 0)), all[key]);
  assert.equal(all.sales, 139092000);
  assert.equal(all.stock, 70388);
  assert.equal(all.variance, -60);
  assert.equal(all.low, 1);
});
test("Cash sale updates volume, stock, cash, margin and continuous nozzle meter", () => {
  let s = C.seed(),
    before = JSON.stringify(s),
    meter = C.meter(s, "central-N1"),
    stock = C.stock(s, "central-petrol"),
    cash = C.expectedCash(s, "central-shift-1");
  const n = run(s, "sale", {
    nozzle: "central-N1",
    closing: meter + 100,
    method: "Cash",
  });
  assert.equal(JSON.stringify(s), before);
  assert.equal(C.stock(n, "central-petrol"), stock - 100);
  assert.equal(C.meter(n, "central-N1"), meter + 100);
  assert.equal(C.expectedCash(n, "central-shift-1"), cash + 1042000);
  assert.equal(C.metrics(n, owner).margin - C.metrics(s, owner).margin, 36000);
  assert.equal(n.tanks[0].stockRevision, 1);
  assert.equal(n.audit[0].text, "100 L petrol sale recorded");
  assert(C.valid(n));
});
test("Credit sale and bank collection reconcile without increasing cash", () => {
  let s = C.seed();
  const cash = C.expectedCash(s, "central-shift-1"),
    balance = C.balance(s, "central-fleet");
  s = run(s, "sale", {
    nozzle: "central-N1",
    closing: C.meter(s, "central-N1") + 100,
    method: "Credit",
    customer: "central-fleet",
  });
  assert.equal(C.balance(s, "central-fleet"), balance + 1042000);
  assert.equal(C.expectedCash(s, "central-shift-1"), cash);
  s = run(s, "collect", {
    customer: "central-fleet",
    amount: 10000,
    method: "Bank",
  });
  assert.equal(C.balance(s, "central-fleet"), balance + 42000);
  assert.equal(C.expectedCash(s, "central-shift-1"), cash);
  assert.throws(
    () =>
      run(s, "collect", {
        customer: "central-fleet",
        amount: 1e8,
        method: "Cash",
      }),
    /exceeds/,
  );
});
test("Cash collections and expenses feed shift expected cash", () => {
  let s = C.seed(),
    cash = C.expectedCash(s, "central-shift-1");
  s = run(s, "collect", {
    customer: "central-fleet",
    amount: 500,
    method: "Cash",
  });
  s = run(s, "expense", {
    amount: 200,
    category: "Repairs",
    note: "Sample repair",
    method: "Cash",
  });
  assert.equal(C.expectedCash(s, "central-shift-1"), cash + 30000);
});
test("No negative sale, reversed meter, excessive stock or wrong-outlet references", () => {
  const s = C.seed();
  for (const closing of [
    0,
    -5,
    "",
    NaN,
    C.meter(s, "central-N1"),
    C.meter(s, "central-N1") - 1,
    C.meter(s, "central-N1") + 20000,
  ])
    assert.throws(() =>
      run(s, "sale", { nozzle: "central-N1", closing, method: "Cash" }),
    );
  assert.throws(() =>
    run(s, "sale", { nozzle: "airport-N1", closing: 1e6, method: "Cash" }),
  );
  assert.throws(() =>
    run(s, "sale", {
      nozzle: "central-N1",
      closing: C.meter(s, "central-N1") + 5,
      method: "Credit",
      customer: "airport-fleet",
    }),
  );
});
test("Credit limit blocks excess exposure", () => {
  const s = C.seed();
  s.customers[0].limit = C.balance(s, "central-fleet");
  assert.throws(
    () =>
      run(s, "sale", {
        nozzle: "central-N1",
        closing: C.meter(s, "central-N1") + 5,
        method: "Credit",
        customer: "central-fleet",
      }),
    /credit limit/,
  );
});
test("Fuel receipt posts accepted litres once and capacity prevents overfill", () => {
  let s = C.seed();
  const old = C.stock(s, "highway-diesel"),
    data = {
      outlet: "highway",
      tank: "highway-diesel",
      received: 5000,
      invoiced: 5010,
      docket: "TST-1",
      supplier: "Demo depot",
    };
  s = run(s, "receipt", data);
  assert.equal(C.stock(s, "highway-diesel"), old + 5000);
  assert.equal(C.metrics(s, owner).low, 0);
  assert.throws(() => run(s, "receipt", data), /already/);
  assert.throws(
    () => run(s, "receipt", { ...data, docket: "TST-2", received: 39999 }),
    /capacity/,
  );
  assert.throws(
    () => run(s, "receipt", { ...data, docket: "TST-3", received: 0.00001 }),
    /decimal places/,
  );
});
test("Tank observations refresh after movement without adjusting book stock", () => {
  let s = C.seed();
  s = run(s, "sale", {
    nozzle: "central-N1",
    closing: C.meter(s, "central-N1") + 50,
    method: "UPI",
  });
  assert.notEqual(s.tanks[0].readingRevision, s.tanks[0].stockRevision);
  const book = C.stock(s, "central-petrol");
  s = run(s, "dip", { tank: "central-petrol", physical: book - 7 });
  assert.equal(s.tanks[0].readingRevision, s.tanks[0].stockRevision);
  assert.equal(C.stock(s, "central-petrol"), book);
  assert.equal(s.tanks[0].physical - book, -7);
  assert.throws(() =>
    run(s, "dip", { tank: "central-petrol", physical: 30000 }),
  );
});
test("Shift variance requires reason; submitted shift blocks cash movements", () => {
  let s = C.seed();
  const counted = C.expectedCash(s, "central-shift-1") / 100 - 200;
  assert.throws(
    () => run(s, "close", { counted, note: "" }, manager),
    /Explain/,
  );
  s = run(s, "close", { counted, note: "Cash short; investigate" }, manager);
  assert.equal(s.shifts[0].status, "submitted");
  assert.equal(s.shifts[0].counted - s.shifts[0].expected, -20000);
  for (const [a, d] of [
    ["sale", { nozzle: "central-N1", closing: 250000, method: "Cash" }],
    ["collect", { customer: "central-fleet", amount: 1, method: "Bank" }],
    ["expense", { amount: 1, note: "test", category: "Other", method: "Bank" }],
  ])
    assert.throws(() => run(s, a, d), /open shift/);
  s = run(s, "approve", { shift: "central-shift-1" });
  assert.equal(s.shifts[0].status, "approved");
  assert.throws(() => run(s, "approve", { shift: "central-shift-1" }));
  s = run(s, "start", { name: "Shift B", float: 1000 }, manager);
  const before = C.meter(s, "central-N1");
  s = run(
    s,
    "sale",
    { nozzle: "central-N1", closing: before + 10, method: "Cash" },
    manager,
  );
  assert.equal(s.sales.at(-1).opening, before);
  assert.equal(s.sales.at(-1).shift, s.shifts.at(-1).id);
  assert(C.valid(s));
});
test("Review by same demo role is denied; corrections reopen the shift", () => {
  let s = C.seed();
  s = run(s, "close", { counted: C.expectedCash(s, "central-shift-1") / 100 });
  assert.throws(
    () => run(s, "approve", { shift: "central-shift-1" }),
    /different reviewing/,
  );
  s = run(s, "reopen", { shift: "central-shift-1" }, accountant);
  assert.equal(s.shifts[0].status, "open");
});
test("Cross-outlet and role action guards", () => {
  const s = C.seed();
  assert.throws(
    () =>
      run(s, "receipt", { outlet: "highway", tank: "highway-diesel" }, manager),
    /outside/,
  );
  assert.throws(() => run(s, "sale", {}, accountant), /unavailable/);
  assert.throws(() => run(s, "approve", {}, manager), /unavailable/);
  assert.equal(C.rows(s, "sales", manager).length, 8);
  assert(C.rows(s, "sales", manager).every((r) => r.outlet === "central"));
});
test("Invalid amounts, categories and dates cannot be stored", () => {
  const s = C.seed();
  for (const amount of [-1, 0, "", NaN, 0.001])
    assert.throws(() =>
      run(s, "collect", { customer: "central-fleet", amount, method: "Cash" }),
    );
  assert.throws(() =>
    run(s, "expense", {
      amount: 100,
      method: "Cash",
      note: "",
      category: "Other",
    }),
  );
  assert.throws(() =>
    run(s, "task", { title: "Check hose", due: "2026-02-31" }),
  );
  assert.throws(
    () => run(s, "start", { name: "B", float: 100 }),
    /previous shift/,
  );
});
test("Maintenance completion is outlet-scoped and not repeatable", () => {
  let s = C.seed();
  s = run(
    s,
    "task",
    { title: "Inspect nozzle hose", due: "2026-11-03" },
    manager,
  );
  const task = s.tasks.at(-1);
  s = run(s, "complete", { task: task.id }, manager);
  assert.equal(s.tasks.at(-1).status, "Done");
  assert.throws(() => run(s, "complete", { task: task.id }));
});
test("Persistence accepts valid snapshots and rejects broken saved records", () => {
  const s = C.seed();
  assert(C.valid(JSON.parse(JSON.stringify(s))));
  for (const bad of [
    null,
    {},
    { ...s, sales: null },
    { ...s, tanks: [{}] },
    { ...s, sales: [{ ...s.sales[0], litres: -1 }] },
    { ...s, sales: [{ ...s.sales[0], nozzle: "wrong" }] },
  ])
    assert.equal(C.valid(bad), false);
});
console.log(`${count} transaction groups passed`);
