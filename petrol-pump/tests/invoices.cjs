const assert = require("node:assert/strict"),
  C = require("../public/core"),
  D = require("../public/documents");
const base = {
  outlet: "central",
  reference: "DEMO-INV-101",
  date: "2026-11-03",
  seller: "Sample Petrol Pump",
  recipient: "Sample Dealer (Accounts)",
  recipientType: "Dealer",
  phone: "+91 98765 43210",
  address: "Sample Road, Pune",
  description: "Petrol supply - sample",
  quantity: "100.125",
  unit: "L",
  rate: "104.20",
  note: "Demonstration only",
};
const before = C.seed(),
  owner = { role: "Owner", outlet: "all" };
const result = C.apply(before, owner, "invoice", base).state,
  r = result.invoices.at(-1);
assert(C.valid(result));
assert.equal(r.amount, 1043303);
assert.equal(r.phone, "919876543210");
assert.deepEqual(C.metrics(result, owner), C.metrics(before, owner));
assert.throws(() => C.apply(result, owner, "invoice", base), /already exists/);
assert.throws(
  () =>
    C.apply(before, { role: "Manager", outlet: "airport" }, "invoice", base),
  /outside/,
);
for (const overrides of [
  { phone: "9876" },
  { phone: "91evil" },
  { quantity: 0 },
  { rate: -1 },
  { rate: "1.001" },
  { date: "2026-02-31" },
  { recipient: "" },
  { recipientType: "Fake" },
])
  assert.throws(() =>
    C.apply(before, owner, "invoice", { ...base, ...overrides }),
  );
const legacy = JSON.parse(JSON.stringify(before));
delete legacy.invoices;
assert(C.valid(legacy));
assert.equal(C.apply(legacy, owner, "invoice", base).state.invoices.length, 1);
const tampered = JSON.parse(JSON.stringify(result));
tampered.invoices[0].amount++;
assert(!C.valid(tampered));
const url = new URL(D.whatsapp(r));
assert.equal(url.hostname, "wa.me");
assert.equal(url.pathname, "/919876543210");
assert(url.searchParams.get("text").includes("DEMO-INV-101"));
assert(url.searchParams.get("text").includes("10,433.03"));
assert(url.searchParams.get("text").includes("attached separately"));
const pdf = D.pdf(r),
  text = new TextDecoder().decode(pdf);
assert(text.startsWith("%PDF-1.4"));
assert(text.includes("DRAFT INVOICE"));
assert(text.endsWith("%%EOF"));
const at = Number(text.match(/startxref\n(\d+)/)[1]);
assert.equal(text.slice(at, at + 4), "xref");
assert.throws(() => D.pdf({ ...r, recipient: "नमूना" }), /Print/);
require("node:fs").writeFileSync("/tmp/Forecourt_Invoice_Test.pdf", pdf);
console.log(
  "PASS draft invoice totals, phone/date validation, scoped access, duplicate protection, legacy records, unchanged ledgers, PDF structure and WhatsApp draft",
);

assert.equal(before.invoices.length, 3);
assert.deepEqual(before.invoices.map((r) => r.recipientType).sort(), [
  "Customer",
  "Dealer",
  "Vendor",
]);
for (const r of before.invoices) {
  assert.equal(r.phone, "");
  assert(D.pdf(r).length > 100);
  assert.equal(new URL(D.whatsapp(r)).pathname, "/");
}
const old = C.seed();
old.invoices = [];
const loaded = C.apply(old, owner, "loadInvoices", { outlet: "central" }).state;
assert.equal(loaded.invoices.length, 3);
assert.deepEqual(C.metrics(loaded, owner), C.metrics(old, owner));
assert.deepEqual(
  C.apply(loaded, owner, "loadInvoices", { outlet: "central" }).state,
  loaded,
);
const scoped = C.apply(
  old,
  { role: "Manager", outlet: "airport" },
  "loadInvoices",
  { outlet: "airport" },
).state;
assert.equal(scoped.invoices.length, 1);
assert.equal(scoped.invoices[0].recipientType, "Vendor");
const updated = C.apply(loaded, owner, "invoicePhone", {
  outlet: "central",
  invoice: loaded.invoices[0].id,
  phone: "919876543210",
}).state;
assert.equal(updated.invoices[0].phone, "919876543210");
assert.equal(updated.invoices[0].status, "Draft");
assert.throws(() =>
  C.apply(loaded, { role: "Manager", outlet: "airport" }, "invoicePhone", {
    outlet: "central",
    invoice: loaded.invoices[0].id,
    phone: "919876543210",
  }),
);
console.log(
  "PASS three complete sample invoices, safe contact picker, idempotent loading, scoped samples and WhatsApp contact editing",
);
