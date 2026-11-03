// Node DOM simulation only. This does not launch or control a browser.
const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { parseHTML } = require(process.env.FORECOURT_DOM_LIB || "linkedom");
function boot(memory = {}, blocked = false) {
  const { document, window } = parseHTML(
    fs.readFileSync("public/index.html", "utf8"),
  );
  const downloads = [],
    events = {};
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      const o =
        [...this.querySelectorAll("option")].find((o) =>
          o.hasAttribute("selected"),
        ) || this.querySelector("option");
      return o?.getAttribute("value") ?? o?.textContent ?? "";
    },
    set(v) {
      for (const o of this.querySelectorAll("option")) {
        if ((o.getAttribute("value") ?? o.textContent) === String(v))
          o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      }
    },
  });
  const $ = (s) => document.querySelector(s);
  $("#modal").showModal = function () {
    this.open = true;
  };
  $("#modal").close = function () {
    this.open = false;
  };
  const create = document.createElement.bind(document);
  document.createElement = (tag) => {
    const el = create(tag);
    if (tag === "a") el.click = () => downloads.push(el.download);
    return el;
  };
  class FormData {
    constructor(form) {
      this.values = [...form.querySelectorAll("[name]")].map((e) => [
        e.getAttribute("name"),
        e.value,
      ]);
    }
    entries() {
      return this.values[Symbol.iterator]();
    }
  }
  const context = {
    document,
    FormData,
    TextEncoder,
    console,
    Blob,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    setTimeout: () => 1,
    window: {
      scrollTo() {},
      print() {
        events.print = true;
      },
      addEventListener: (name, cb) => (events[name] = cb),
    },
    localStorage: {
      getItem: (k) => {
        if (blocked) throw Error("blocked");
        return memory[k] ?? null;
      },
      setItem: (k, v) => {
        if (blocked) throw Error("blocked");
        memory[k] = v;
      },
    },
  };
  vm.createContext(context);
  for (const f of [
    "storage.js",
    "operations.js",
    "core.js",
    "documents.js",
    "workflows.js",
    "usability.js",
    "app.js",
  ])
    vm.runInContext(fs.readFileSync("public/" + f, "utf8"), context);
  const fire = (selector, type = "click") => {
    assert($(selector), "Missing " + selector);
    $(selector).dispatchEvent(
      new window.Event(type, { bubbles: true, cancelable: true }),
    );
  };
  const fill = (values) => {
    for (const [key, value] of Object.entries(values)) {
      $(`#transaction-form [name="${key}"]`).value = String(value);
    }
  };
  const change = (sel, val) => {
    $(sel).value = val;
    fire(sel, "change");
  };
  return {
    $,
    fire,
    fill,
    change,
    memory,
    downloads,
    events,
    run: (code) => vm.runInContext(code, context),
  };
}
const a = boot();
assert.equal(a.$("h1").textContent, "Overview");
assert.equal(a.$(".kpi-value").textContent, "₹13,90,920");
assert.equal(a.$("#outlet-select").querySelectorAll("option").length, 4);
let rendered = 0;
for (const role of ["Owner", "Manager", "Accountant"]) {
  a.change("#role-select", role);
  for (const o of ["central", "highway", "airport"]) {
    a.change("#outlet-select", o);
    const links = [...a.$("nav").querySelectorAll("[data-page]")].map(
      (x) => x.dataset.page,
    );
    for (const page of links) {
      a.fire(`nav [data-page="${page}"]`);
      assert(a.$("h1"));
      assert(!a.$("#main").innerHTML.includes("undefined"));
      assert(!a.$("#main").textContent.includes("NaN"));
      rendered++;
    }
  }
}
a.change("#role-select", "Owner");
a.change("#outlet-select", "all");
a.fire('nav [data-page="sales"]');
a.fire('[data-action="sale"]');
assert(a.$("#modal").open);
a.fill({
  outlet: "central",
  nozzle: "central-N1",
  closing: 242200,
  method: "Cash",
});
a.fire("#transaction-form", "submit");
assert(!a.$("#modal").open);
assert(a.run("state.sales.length") === 25);
assert.equal(a.run('C.stock(state,"central-petrol")'), 9800);
assert(a.memory["forecourt-demo-v1"]);
a.fire('[data-action="sale"]');
a.fill({ closing: 1, method: "Cash" });
a.fire("#transaction-form", "submit");
assert(a.$("#form-error").textContent.includes("Closing meter"));
a.fire('[data-action="dismiss"]');
a.fire('nav [data-page="tanks"]');
assert(a.$("#main").textContent.includes("New reading needed"));
a.fire('[data-action="dip"][data-id="central-petrol"]');
a.fill({ physical: 9800 });
a.fire("#transaction-form", "submit");
assert.equal(a.run("state.tanks[0].physical"), 9800);
a.fire('nav [data-page="receipts"]');
a.fire('[data-action="receipt"]');
a.change("#form-outlet", "highway");
a.fill({
  tank: "highway-diesel",
  docket: "DOM-1",
  supplier: "Test <Depot>",
  received: 5000,
  invoiced: 5000,
  note: "",
});
a.fire("#transaction-form", "submit");
assert(a.$("#main").textContent.includes("Test <Depot>"));
assert(!a.$("#main").querySelector("Depot"));
assert.equal(a.run('C.stock(state,"highway-diesel")'), 10200);
a.change("#role-select", "Manager");
a.change("#outlet-select", "central");
a.fire('nav [data-page="shifts"]');
a.fire('[data-action="close"]');
const counted = a.run('C.expectedCash(state,"central-shift-1")/100-200');
a.fill({ counted, note: "Test shortage" });
a.fire("#transaction-form", "submit");
assert.equal(a.run("state.shifts[0].status"), "submitted");
assert(!a.$('[data-action="approve"]'));
a.change("#role-select", "Owner");
a.fire('nav [data-page="shifts"]');
a.fire('[data-action="approve"]');
assert.equal(a.run("state.shifts[0].status"), "approved");
a.change("#outlet-select", "airport");
a.fire('nav [data-page="credit"]');
const before = a.run('C.balance(state,"airport-fleet")');
a.fire('[data-action="collect"]');
a.fill({ amount: 10000, method: "Bank" });
a.fire("#transaction-form", "submit");
assert.equal(a.run('C.balance(state,"airport-fleet")'), before - 1000000);
a.fire('nav [data-page="expenses"]');
a.fire('[data-action="expense"]');
a.fill({ amount: 200, method: "Cash", note: "Test supplies" });
a.fire("#transaction-form", "submit");
assert(a.$("#main").textContent.includes("Test supplies"));
a.fire('nav [data-page="maintenance"]');
a.fire('[data-action="task"]');
a.fill({ title: "Check hose <script>alert(1)</script>", due: "2026-11-03" });
a.fire("#transaction-form", "submit");
assert(a.$("#main").textContent.includes("Check hose <script>"));
assert(!a.$("#main").querySelector("script"));
const tid = a.run("state.tasks.at(-1).id");
a.fire(`[data-action="complete"][data-id="${tid}"]`);
assert.equal(a.run("state.tasks.at(-1).status"), "Done");
a.change("#outlet-select", "all");
a.fire('nav [data-page="reports"]');
a.fire('[data-action="export"]');
assert.equal(a.downloads[0], "Forecourt-all-sample-sales.csv");
a.fire('[data-action="print"]');
assert(a.events.print);
a.fire('[data-action="tour"]');
assert.equal(a.$(".tour-list").children.length, 7);
a.fire('[data-action="dismiss"]');
const reload = boot(a.memory);
assert.equal(reload.run("state.sales.length"), 25);
assert.equal(reload.run("state.shifts[0].status"), "approved");
const blocked = boot({}, true);
blocked.fire('[data-action="sale"]');
blocked.fill({ closing: 242200 });
blocked.fire("#transaction-form", "submit");
assert(blocked.$(".notice").textContent.includes("Storage is unavailable"));
assert.equal(blocked.run("state.sales.length"), 25);
for (const raw of ["broken", "{}", '{"version":1,"sales":[null]}']) {
  const corrupt = boot({ "forecourt-demo-v1": raw });
  assert(corrupt.$(".notice").textContent.includes("could not be loaded"));
  assert.equal(corrupt.run("state.sales.length"), 24);
}
const stale = boot();
stale.fire('[data-action="sale"]');
stale.fill({ closing: 242200 });
stale.memory["forecourt-demo-v1"] = JSON.stringify({
  ...stale.run("C.seed()"),
  revision: 9,
});
stale.fire("#transaction-form", "submit");
assert(stale.$("#form-error").textContent.includes("Another tab"));
assert.equal(stale.run("state.sales.length"), 24);
a.fire('[data-action="reset"]');
a.fire('[data-action="confirm-reset"]');
assert.equal(a.run("state.sales.length"), 24);
assert.equal(a.run("state.shifts[0].status"), "open");
console.log(
  `PASS ${rendered} role/outlet/module renders; forms; connected workflow; validation errors; HTML escaping; CSV; print trigger; walkthrough; refresh; blocked/corrupt storage; stale-tab protection; reset`,
);

const protectedData = boot({ "forecourt-demo-v1": "{damaged" });
protectedData.fire('[data-action="sale"]');
protectedData.fill({ closing: 242200 });
protectedData.fire("#transaction-form", "submit");
assert(protectedData.$("#form-error").textContent.includes("recovery"));
assert.equal(protectedData.memory["forecourt-demo-v1"], "{damaged");
protectedData.fire('[data-action="dismiss"]');
protectedData.fire('[data-action="backup"]');
assert.equal(protectedData.downloads[0], "Forecourt-demo-recovery.json");
const changedForm = boot();
changedForm.fire('[data-action="sale"]');
changedForm.fill({ closing: 242200 });
const next = changedForm.run("C.seed()");
next.revision = 1;
changedForm.memory["forecourt-demo-v1"] = JSON.stringify(next);
changedForm.events.storage({ key: "forecourt-demo-v1" });
changedForm.fire("#transaction-form", "submit");
assert(changedForm.$("#form-error").textContent.includes("out of date"));
assert.equal(changedForm.run("state.sales.length"), 24);
console.log(
  "PASS recovery export, corrupt data write protection and storage-event stale form rejection",
);

assert.equal(a.run("money(12345)"), "₹123.45");
assert.equal(a.run("money(-2050)"), "-₹20.50".replace("-₹", "₹-"));
assert.equal(a.run("litres(0.001)"), "0.001 L");
console.log("PASS paise and millilitre display precision");

const operational = boot();
assert(operational.$("#main").textContent.includes("Outlet & shift register"));
assert(operational.$("#main").textContent.includes("Tank reconciliation"));
assert(!operational.$(".bar-chart"));
operational.fire('[data-action="station-ledger"][data-id="highway"]');
assert.equal(operational.$("#outlet-select").value, "highway");
assert.equal(operational.$("h1").textContent, "Shift reconciliation");
assert(operational.$("#main").textContent.includes("Highway Junction"));
console.log("PASS operations-first overview and outlet-to-shift navigation");

const billing = boot();
billing.fire('nav [data-page="invoices"]');
billing.fire('[data-action="invoice"]');
billing.fill({
  reference: "DOM-INV-001",
  date: "2026-11-03",
  seller: "Sample pump",
  recipient: "Test <Dealer>",
  recipientType: "Dealer",
  address: "Sample address",
  phone: "919876543210",
  description: "Petrol supply",
  quantity: "100",
  rate: "104.20",
  unit: "L",
});
billing.fire("#transaction-form", "submit");
assert.equal(
  billing.run("state.invoices.length"),
  4,
  billing.$("#form-error")?.textContent,
);
assert(billing.$("#invoice-sheet").textContent.includes("Test <Dealer>"));
assert(!billing.$("#invoice-sheet").querySelector("Dealer"));
const share = billing.$('#invoice-sheet a[href^="https://wa.me/"]');
assert(share);
assert(
  share.getAttribute("href").startsWith("https://wa.me/919876543210?text="),
);
assert(share.getAttribute("href").includes("DOM-INV-001"));
billing.fire('[data-action="invoice-pdf"]');
assert.equal(billing.downloads[0], "Forecourt-DOM-INV-001.pdf");
billing.fire('[data-action="invoice-print"]');
assert(billing.events.print);
const restoredBilling = boot(billing.memory);
restoredBilling.fire('nav [data-page="invoices"]');
assert(restoredBilling.$("#invoice-sheet").textContent.includes("DOM-INV-001"));
billing.change("#role-select", "Manager");
billing.change("#outlet-select", "airport");
billing.fire('nav [data-page="invoices"]');
assert(!billing.$("#invoice-sheet").textContent.includes("DOM-INV-001"));
console.log(
  "PASS invoice form, escaped preview, PDF download, print invocation, WhatsApp recipient/message, reload and outlet visibility",
);
const samples = boot();
samples.fire('nav [data-page="invoices"]');
assert(samples.$("#main").textContent.includes("DEMO-CUST-001"));
assert(samples.$("#main").textContent.includes("DEMO-VEND-001"));
assert(samples.$("#main").textContent.includes("DEMO-DEAL-001"));
samples.fire('[data-action="load-invoice-samples"]');
assert.equal(samples.run("state.invoices.length"), 3);
samples.fire('[data-action="invoice-contact"]');
samples.fill({ phone: "919876543210" });
samples.fire("#transaction-form", "submit");
assert(!samples.$("#modal").open);
assert(
  samples
    .$('#invoice-sheet a[href^="https://wa.me/"]')
    .getAttribute("href")
    .includes("/919876543210?"),
);
console.log(
  "PASS sample invoice register, repeat load and recipient number editing",
);

const completeDemo = boot();
completeDemo.fire('[data-action="load-workflow-samples"]');
completeDemo.fire('[data-action="confirm-workflow-samples"]');
assert.equal(completeDemo.run("state.operations.length"), 7);
completeDemo.fire('nav [data-page="sales"]');
assert(completeDemo.$("#main").textContent.includes("Split"));
assert(completeDemo.$("#main").textContent.includes("5,000"));
completeDemo.fire('nav [data-page="testing"]');
assert(completeDemo.$("#main").textContent.includes("5 L"));
completeDemo.fire('[data-action="nozzleTest"]');
completeDemo.fill({ litres: 5, note: "DOM nozzle test" });
completeDemo.fire("#transaction-form", "submit");
assert(!completeDemo.$("#modal").open);
const testID = completeDemo.run("state.operations.at(-1).id");
completeDemo.fire(`[data-action="testReturn"][data-id="${testID}"]`);
completeDemo.fill({ litres: 5 });
completeDemo.fire("#transaction-form", "submit");
assert(!completeDemo.$("#modal").open);
completeDemo.fire('nav [data-page="settlements"]');
assert(completeDemo.$("#main").textContent.includes("Matched"));
assert(completeDemo.$("#main").textContent.includes("Exception"));
completeDemo.fire('nav [data-page="suppliers"]');
assert(completeDemo.$("#main").textContent.includes("2,50,000"));
const billID = completeDemo.run(
  'state.operations.find(r=>r.kind==="supplierBill").id',
);
completeDemo.fire(`[data-action="supplierPay"][data-id="${billID}"]`);
completeDemo.fill({ reference: "DOM-PAY-100", amount: 10000 });
completeDemo.fire("#transaction-form", "submit");
assert(!completeDemo.$("#modal").open);
assert(completeDemo.$("#main").textContent.includes("2,40,000"));
completeDemo.fire('nav [data-page="handover"]');
assert(completeDemo.$("#main").textContent.includes("Kavita Rao"));
completeDemo.fire('nav [data-page="invoices"]');
assert(completeDemo.$("#main").textContent.includes("WF-DEMO-INV"));
assert(completeDemo.$("#invoice-sheet").textContent.includes("Source sale:"));
completeDemo.fire('[data-action="invoice"]');
const source = completeDemo.run('state.sales.find(r=>r.method==="Credit").id');
completeDemo.change('[name="sourceSale"]', source);
assert(completeDemo.$('[name="quantity"]').readOnly);
completeDemo.fill({
  reference: "DOM-LINK-2",
  date: "2026-11-03",
  address: "Sample street",
});
completeDemo.fire("#transaction-form", "submit");
assert(!completeDemo.$("#modal").open);
assert.equal(completeDemo.run("state.invoices.at(-1).sourceSale"), source);
console.log(
  "PASS complete workflow screens, tender allocation, nozzle test/return forms, settlement outcomes, partial supplier payment, staff handover and sale-linked invoice form",
);

const simple = boot();
assert.equal(simple.$("#primary-nav").querySelectorAll("details").length, 4);
assert.equal(
  simple.$("#primary-nav").querySelectorAll("details[open]").length,
  0,
);
assert.equal(
  simple.$("#primary-nav").querySelectorAll("[data-page]").length,
  16,
);
simple.fire('[data-action="find-task"]');
simple.$("#task-query").value = "WhatsApp";
simple.fire("#task-query", "input");
assert(simple.$("#task-results").textContent.includes("Create an invoice"));
const task = simple.$('#task-results [data-action="choose-task"]');
simple.fire(`[data-action="choose-task"][data-id="${task.dataset.id}"]`);
assert(simple.$("#transaction-form"));
assert(simple.$(".entry-details"));
simple.fire('[data-action="dismiss"]');
simple.fire('[data-action="sale"]');
simple.fill({ closing: 242200, method: "Split" });
simple.fire('[name="method"]', "change");
simple.fill({
  splitUPI: 3000,
  splitCard: 2000,
  splitCredit: 420,
  customer: "central-fleet",
});
simple.fire('[data-action="split-remainder"]');
assert.equal(simple.$('[name="splitCash"]').value, "5000.00");
assert(simple.$("#split-balance").textContent.includes("Balanced"));
simple.fire("#transaction-form", "submit");
assert(simple.$(".next-step").textContent.includes("Create invoice"));
simple.fire('[data-action="follow-next"]');
assert.equal(
  simple.$('[name="sourceSale"]').value,
  simple.run("state.sales.at(-1).id"),
);
assert.equal(simple.$('[name="quantity"]').value, "100");
assert(simple.$("#invoice-total-hint").textContent.includes("10,420"));
simple.fill({ address: "Sample customer address" });
simple.fire("#transaction-form", "submit");
assert(simple.$(".next-step").textContent.includes("Preview & share"));
simple.fire('[data-action="follow-next"]');
assert.equal(simple.$("h1").textContent, "Invoices & sharing");
assert(simple.$("#invoice-sheet").textContent.includes("Source sale:"));
const guided = boot();
guided.fire('nav [data-page="receipts"]');
assert(guided.$(".help-disclosure"));
guided.fire('[data-action="receipt"]');
guided.fill({
  tank: "central-diesel",
  docket: "GUIDED-DELIVERY",
  supplier: "Sample Depot",
  invoiced: 100,
  received: 100,
});
guided.fire("#transaction-form", "submit");
const receipt = guided.run("state.receipts.at(-1).id");
guided.fire('[data-action="follow-next"]');
assert.equal(guided.$('[name="receipt"]').value, receipt);
guided.fill({ reference: "GUIDED-BILL", amount: 9000 });
guided.fire("#transaction-form", "submit");
const bill = guided.run("state.operations.at(-1).id");
guided.fire('[data-action="follow-next"]');
assert.equal(guided.$('[name="bill"]').value, bill);
guided.fill({ reference: "GUIDED-BANK", amount: 1000 });
guided.fire("#transaction-form", "submit");
assert(!guided.$("#modal").open);
console.log(
  "PASS compact navigation without lost modules, task search, optional invoice details, split remainder helper, linked sale→invoice→share and receipt→bill→payment journeys",
);
