"use strict";
let uiNext = null;
const workAreas = [
  { name: "Today", pages: ["overview"] },
  { name: "Sales & shifts", pages: ["sales", "testing", "handover", "shifts"] },
  { name: "Fuel stock", pages: ["tanks", "receipts"] },
  {
    name: "Accounts",
    pages: ["credit", "invoices", "settlements", "suppliers", "expenses"],
  },
  {
    name: "Management",
    pages: ["outlets", "reports", "maintenance", "activity"],
  },
];
function simpleNavigation() {
  return workAreas
    .map((g) => {
      const pages = g.pages.filter((p) => C.ROLES[ctx.role].includes(p));
      if (!pages.length) return "";
      const links = pages
        .map(
          (p) =>
            `<button data-page="${p}" class="nav-item ${page === p ? "selected" : ""}" ${page === p ? 'aria-current="page"' : ""}>${icon(p)}<span>${labels[p]}</span></button>`,
        )
        .join("");
      return pages.length === 1
        ? links
        : `<details class="nav-group" ${pages.includes(page) ? "open" : ""}><summary>${g.name}<span aria-hidden="true">⌄</span></summary>${links}</details>`;
    })
    .join("");
}
function workspaceTabs() {
  const g = workAreas.find((g) => g.pages.includes(page));
  if (!g) return "";
  const pages = g.pages.filter((p) => C.ROLES[ctx.role].includes(p));
  return pages.length < 2
    ? ""
    : `<nav class="workspace-tabs" aria-label="${g.name}">${pages.map((p) => `<button data-page="${p}" ${p === page ? 'aria-current="page"' : ""}>${labels[p]}</button>`).join("")}</nav>`;
}
function taskList() {
  const finance = ["Owner", "Accountant"].includes(ctx.role),
    station = ctx.role !== "Accountant";
  return [
    ...C.ROLES[ctx.role].map((p) => ({
      label: labels[p],
      detail: "Open register",
      page: p,
    })),
    ...(station
      ? [
          {
            label: "Record a fuel sale",
            detail: "Cash, UPI, card, credit or split",
            action: "sale",
          },
          {
            label: "Receive a tanker delivery",
            detail: "Add accepted fuel to stock",
            action: "receipt",
          },
          {
            label: "Record a tank reading",
            detail: "Compare physical and book stock",
            action: "dip",
          },
          {
            label: "Test a nozzle",
            detail: "Measure fuel and record its return",
            action: "nozzleTest",
          },
          {
            label: "Hand over a shift",
            detail: "Record staff and cash handed over",
            action: "handover",
          },
          {
            label: "Close a shift",
            detail: "Count cash and submit for review",
            action: "close",
          },
        ]
      : []),
    ...(finance
      ? [
          {
            label: "Book a supplier bill",
            detail: "Link it to a fuel receipt",
            action: "supplierBill",
          },
          {
            label: "Reconcile a bank settlement",
            detail: "Match UPI or card sales",
            action: "settlement",
          },
        ]
      : []),
    {
      label: "Create an invoice for WhatsApp",
      detail: "Preview, download and share a draft",
      action: "invoice",
    },
    {
      label: "Collect fleet dues",
      detail: "Record customer payment",
      action: "collect",
    },
    {
      label: "Record an expense",
      detail: "Cash or digital payment",
      action: "expense",
    },
  ];
}
function openTaskSearch() {
  if ($("#modal").open && $("#transaction-form")) {
    toast("Finish or cancel the current entry first.");
    return;
  }
  openDialog(
    `<div class="modal-head"><h2 id="modal-title">What do you need to do?</h2><button class="icon-btn" data-action="dismiss" aria-label="Close">${icon("close")}</button></div><div class="modal-body"><label class="field">Find a task<input id="task-query" type="search" placeholder="Try invoice, fuel return, cash or supplier…" autocomplete="off"></label><div id="task-results"></div></div>`,
  );
  drawTaskResults("");
  $("#task-query")?.focus();
}
function drawTaskResults(query) {
  const all = taskList(),
    q = query.trim().toLowerCase();
  const filtered = all
    .map((t, i) => ({ ...t, index: i }))
    .filter((t) =>
      q
        .split(/\s+/)
        .every((word) =>
          (t.label + " " + t.detail).toLowerCase().includes(word),
        ),
    );
  $("#task-results").innerHTML = filtered.length
    ? filtered
        .map(
          (t) =>
            `<button class="task-result" data-action="choose-task" data-id="${t.index}"><strong>${esc(t.label)}</strong><small>${esc(t.detail)}</small></button>`,
        )
        .join("")
    : '<p class="empty">No matching task. Try a shorter search.</p>';
}
function nextStepFor(action, state, input) {
  const outlet = input.outlet,
    find = (kind) =>
      (state.operations || [])
        .filter((r) => r.outlet === outlet && r.kind === kind)
        .at(-1);
  if (action === "sale")
    return {
      outlet,
      title: "Sale recorded",
      description: "Stock, tender totals and any fleet balance are updated.",
      label: "Create invoice for this sale",
      action: "invoice",
      id: state.sales.at(-1).id,
    };
  if (action === "receipt")
    return {
      outlet,
      title: "Fuel received",
      description:
        "Stock is updated. Continue with the supplier document when available.",
      label: "Book supplier bill",
      action: "supplierBill",
      id: state.receipts.at(-1).id,
    };
  if (action === "supplierBill")
    return {
      outlet,
      title: "Supplier bill booked",
      description: "You can record a full or partial bank payment.",
      label: "Record payment",
      action: "supplierPay",
      id: find("supplierBill").id,
    };
  if (action === "nozzleTest")
    return {
      outlet,
      title: "Test fuel withdrawn",
      description: "Record the volume actually returned to the tank.",
      label: "Record fuel return",
      action: "testReturn",
      id: find("nozzleTest").id,
    };
  if (action === "handover")
    return {
      outlet,
      title: "Handover recorded",
      description:
        "Continue operating, or count and close the shift when it ends.",
      label: "Close this shift",
      action: "close",
    };
  if (action === "invoice")
    return {
      outlet,
      title: "Invoice draft ready",
      description: "Preview it, download the PDF and open the WhatsApp draft.",
      label: "Preview & share",
      page: "invoices",
      id: state.invoices.at(-1).id,
    };
  if (action === "close")
    return {
      outlet,
      title: "Shift submitted",
      description: "Switch to Owner or Accountant for independent review.",
      label: "View shift register",
      page: "shifts",
    };
  return null;
}
function nextStepBanner() {
  if (!uiNext) return "";
  return `<section class="next-step" aria-label="Next step"><div><strong>${esc(uiNext.title)}</strong><p>${esc(outlet(uiNext.outlet).name)} · ${esc(uiNext.description)}</p></div><div class="button-row"><button class="btn primary" data-action="follow-next">${esc(uiNext.label)}</button><button class="text-btn" data-action="dismiss-next">Done</button></div></section>`;
}
function formContext(action, o) {
  const shift = state.shifts.filter((s) => s.outlet === o).at(-1);
  return `<div class="entry-context"><strong>${esc(outlet(o).name)}</strong><span>${shift ? esc(shift.name) + " · " + esc(shift.status) : "No shift"}${ctx.role === "Owner" && ctx.outlet === "all" ? " · Choose another outlet below if needed" : ""}</span></div>`;
}
function polishEntry(action, o) {
  const root = $("#dependent-fields");
  if (!root) return;
  if (action === "invoice") {
    const detail = document.createElement("details");
    detail.className = "entry-details";
    detail.innerHTML = "<summary>Document details & optional note</summary>";
    for (const name of ["seller", "reference", "date", "note"]) {
      const input = root.querySelector(`[name="${name}"]`);
      if (input) detail.appendChild(input.closest("label"));
    }
    root.appendChild(detail);
    const hint = document.createElement("div");
    hint.id = "invoice-total-hint";
    hint.className = "form-callout";
    root.appendChild(hint);
  }
  root.insertAdjacentHTML("afterbegin", formContext(action, o));
  if (action === "sale") {
    const host = $("#split-fields");
    if (host)
      host.insertAdjacentHTML(
        "beforeend",
        '<div id="split-balance" class="form-callout" role="status"></div><button type="button" class="text-btn" data-action="split-remainder">Put the remaining amount in Cash</button>',
      );
  }
}
function helpfulTotals() {
  const f = $("#transaction-form");
  if (!f) return;
  const read = (n) => f.querySelector(`[name="${n}"]`)?.value;
  if ($("#invoice-total-hint")) {
    const q = Number(read("quantity")),
      p = Number(read("rate"));
    $("#invoice-total-hint").textContent =
      Number.isFinite(q * p) && q > 0 && p > 0
        ? "Draft total: " + money(Math.round(q * p * 100))
        : "Enter quantity and unit price to see the draft total.";
  }
  if ($("#split-balance")) {
    const n = nozzle(read("nozzle")),
      qty = n ? C.round(Number(read("closing")) - C.meter(state, n.id)) : 0,
      total = qty > 0 ? Math.round(qty * tank(n.tank).rate) : 0,
      entered = ["Cash", "UPI", "Card", "Credit"].reduce(
        (v, m) => v + Math.round(Number(read("split" + m) || 0) * 100),
        0,
      );
    $("#split-balance").textContent =
      total > 0
        ? "Sale " +
          money(total) +
          " · Allocated " +
          money(entered) +
          " · " +
          (total === entered
            ? "Balanced"
            : total > entered
              ? "Remaining " + money(total - entered)
              : "Over by " + money(entered - total))
        : "Enter the closing meter reading first.";
  }
}

function applyHelpDisclosure() {
  for (const box of document.querySelectorAll("#main div.note-box"))
    box.outerHTML =
      '<details class="note-box help-disclosure"><summary>How this works</summary><div>' +
      box.innerHTML +
      "</div></details>";
}
