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
  r = result.invoices[0];
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
