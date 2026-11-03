const assert = require("node:assert/strict"),
  C = require("../public/core");
let s = C.seed();
const owner = { role: "Owner", outlet: "all" },
  manager = { role: "Manager", outlet: "central" };
const run = (a, d, ctx = owner) => {
  s = C.apply(s, ctx, a, { outlet: "central", ...d }).state;
  assert(C.valid(s));
  return s;
};
const start = C.metrics(s, owner),
  cash = C.expectedCash(s, "central-shift-1"),
  due = C.balance(s, "central-fleet");
run("sale", {
  nozzle: "central-N1",
  closing: C.meter(s, "central-N1") + 100,
  method: "Split",
  customer: "central-fleet",
  splitCash: "5000",
  splitUPI: "3000",
  splitCard: "2000",
  splitCredit: "420",
});
const sale = s.sales.at(-1);
assert.equal(C.expectedCash(s, "central-shift-1"), cash + 500000);
assert.equal(C.balance(s, "central-fleet"), due + 42000);
assert.equal(C.metrics(s, owner).sales, start.sales + 1042000);
assert.equal(C.metrics(s, owner).litres, start.litres + 100);
assert.throws(
  () =>
    C.apply(s, owner, "sale", {
      outlet: "central",
      nozzle: "central-N1",
      closing: C.meter(s, "central-N1") + 10,
      method: "Split",
      customer: "central-fleet",
      splitCash: 1,
      splitUPI: 1,
      splitCard: 0,
      splitCredit: 0,
    }),
  /equal/,
);
const stock = C.stock(s, "central-petrol"),
  meter = C.meter(s, "central-N1"),
  value = C.metrics(s, owner).sales;
run("nozzleTest", {
  nozzle: "central-N1",
  litres: 5,
  note: "Sample measure test",
});
const test = s.operations.at(-1);
assert.equal(C.meter(s, "central-N1"), meter + 5);
assert.equal(C.stock(s, "central-petrol"), stock - 5);
assert.equal(C.metrics(s, owner).sales, value);
run("testReturn", { test: test.id, litres: 3 });
assert.equal(C.stock(s, "central-petrol"), stock - 2);
assert.throws(
  () =>
    C.apply(s, owner, "testReturn", {
      outlet: "central",
      test: test.id,
      litres: 3,
    }),
  /exceeds/,
);
run("testReturn", { test: test.id, litres: 2 });
assert.equal(C.stock(s, "central-petrol"), stock);
run("sale", {
  nozzle: "central-N1",
  closing: C.meter(s, "central-N1") + 1,
  method: "Cash",
});
assert.equal(s.sales.at(-1).opening, meter + 5);
run("settlement", {
  sale: sale.id,
  method: "UPI",
  reference: "WF-BANK-1",
  fee: 10,
  received: 2990,
});
assert.equal(s.operations.at(-1).difference, 0);
assert.throws(
  () =>
    C.apply(s, owner, "settlement", {
      outlet: "central",
      sale: sale.id,
      method: "UPI",
      reference: "OTHER",
      fee: 0,
      received: 3000,
    }),
  /already/,
);
run("settlement", {
  sale: sale.id,
  method: "Card",
  reference: "WF-BANK-2",
  fee: 20,
  received: 1970,
});
assert.equal(s.operations.at(-1).difference, -1000);
const oldStock = C.stock(s, "central-diesel");
run("supplierBill", {
  receipt: "GR-100",
  reference: "WF-BILL-1",
  amount: 450000,
});
const bill = s.operations.at(-1);
assert.equal(C.stock(s, "central-diesel"), oldStock);
run("supplierPay", { bill: bill.id, reference: "WF-PAY-1", amount: 200000 });
assert.equal(bill.amount - C.Ops.paid(s, bill.id), 25000000);
assert.throws(
  () =>
    C.apply(s, owner, "supplierPay", {
      outlet: "central",
      bill: bill.id,
      reference: "WF-PAY-2",
      amount: 300000,
    }),
  /exceeds/,
);
assert.throws(
  () =>
    C.apply(s, owner, "supplierBill", {
      outlet: "central",
      receipt: "GR-100",
      reference: "DUP",
      amount: 100,
    }),
  /already/,
);
const beforeInvoice = C.metrics(s, owner);
run("invoice", {
  sourceSale: sale.id,
  reference: "WF-INV-1",
  date: "2026-11-03",
  seller: "Central Sample",
  recipient: "Meridian Sample",
  recipientType: "Customer",
  address: "Sample Road",
  description: "Petrol",
  quantity: sale.litres,
  rate: sale.rate / 100,
  unit: "L",
});
assert.deepEqual(C.metrics(s, owner), beforeInvoice);
assert.equal(s.invoices.at(-1).sourceSale, sale.id);
assert.throws(
  () =>
    C.apply(s, owner, "invoice", {
      outlet: "central",
      sourceSale: sale.id,
      reference: "WF-INV-2",
      date: "2026-11-03",
      seller: "Sample",
      recipient: "Sample",
      recipientType: "Customer",
      address: "Road",
      description: "Petrol",
      quantity: 100,
      rate: 104.2,
      unit: "L",
    }),
  /already/,
);
run(
  "handover",
  {
    outgoing: "Sample Operator A",
    incoming: "Sample Operator B",
    counted: C.expectedCash(s, "central-shift-1") / 100 - 200,
    note: "Sample cash shortage",
  },
  manager,
);
assert.equal(
  s.operations.at(-1).counted - s.operations.at(-1).expected,
  -20000,
);
assert.equal(s.shifts[0].status, "open");
for (const a of ["settlement", "supplierBill", "supplierPay"])
  assert.throws(
    () => C.apply(s, manager, a, { outlet: "central" }),
    /unavailable/,
  );
const tampered = JSON.parse(JSON.stringify(s));
tampered.operations.find((r) => r.kind === "supplierPay").amount = 1e11;
assert(!C.valid(tampered));
run("close", { counted: C.expectedCash(s, "central-shift-1") / 100 }, manager);
assert.throws(
  () =>
    C.apply(s, owner, "nozzleTest", {
      outlet: "central",
      nozzle: "central-N1",
      litres: 5,
      note: "Test",
    }),
  /open shift/,
);
console.log(
  "PASS split tenders, test/partial returns and meter continuity, bank matching/exceptions, supplier bills/partial payments, linked invoice no double posting, staff cash handover and role/shift guards",
);

const complete = C.apply(C.seed(), owner, "loadWorkflowSamples", {
  outlet: "central",
}).state;
assert(C.valid(complete));
assert.equal(complete.sales.at(-1).method, "Split");
assert.equal(complete.invoices.at(-1).sourceSale, complete.sales.at(-1).id);
assert.equal(
  C.stock(complete, "central-petrol"),
  C.stock(C.seed(), "central-petrol") - 100,
);
assert.equal(
  C.balance(complete, "central-fleet"),
  C.balance(C.seed(), "central-fleet") + 42000,
);
assert.equal(
  complete.operations.filter((r) => r.kind === "settlement").length,
  2,
);
assert(
  complete.operations.some(
    (r) => r.kind === "settlement" && r.difference === -1000,
  ),
);
assert.deepEqual(
  C.apply(complete, owner, "loadWorkflowSamples", { outlet: "central" }).state,
  complete,
);
const afterHand = C.apply(complete, owner, "sale", {
  outlet: "central",
  nozzle: "central-N1",
  closing: C.meter(complete, "central-N1") + 1,
  method: "Cash",
}).state;
assert.equal(afterHand.sales.at(-1).operator, "Kavita Rao (sample)");
assert.throws(
  () =>
    C.apply(
      complete,
      { role: "Manager", outlet: "central" },
      "loadWorkflowSamples",
      { outlet: "central" },
    ),
  /Owner/,
);
console.log(
  "PASS complete example loading, no duplicate samples, linked invoice, returned test fuel and handover operator on subsequent sale",
);
