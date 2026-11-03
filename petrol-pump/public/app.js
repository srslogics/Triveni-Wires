"use strict";
const C = Forecourt,
  $ = (s) => document.querySelector(s),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const fmt = (n, d = 0) =>
    Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }),
  money = (n) => "₹" + fmt(n / 100, n % 100 === 0 ? 0 : 2),
  rate = (n) => "₹" + fmt(n / 100, 2),
  litres = (n) => fmt(n, Number.isInteger(n) ? 0 : 3) + " L";
const icons = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  outlets: '<path d="M3 10h18L18 3H6zM5 10v11h14V10M9 21v-7h6v7"/>',
  sales:
    '<path d="M5 21V3h12v18M3 21h16M8 7h6M8 11h6M17 8h3v8a2 2 0 0 0 4 0"/>',
  tanks:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  receipts:
    '<path d="M2 5h12v12H2zM14 10h4l4 4v3h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  shifts: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  credit:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  expenses: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3"/>',
  maintenance:
    '<path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 2-3-3z"/>',
  reports: '<path d="M4 21V3h12l4 4v14zM16 3v5h4M8 17v-3M12 17V9M16 17v-5"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 17v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.overview}</svg>`;
const labels = {
  overview: "Overview",
  outlets: "Outlet performance",
  sales: "Sales & nozzles",
  tanks: "Tank inventory",
  receipts: "Fuel receipts",
  shifts: "Shift reconciliation",
  credit: "Fleet & credit",
  expenses: "Expenses",
  maintenance: "Maintenance",
  reports: "Reports",
  activity: "Activity log",
};
let state = C.seed(),
  ctx = { role: "Owner", outlet: "all" },
  page = "overview",
  query = "",
  notice = "",
  menu = false,
  lastFocus;
const repository = ForecourtStorage.create(() => localStorage, C.KEY, C.valid);
const loaded = repository.read();
let observedRaw = loaded.raw;
if (loaded.status === "ok") state = loaded.state;
else if (loaded.status === "invalid")
  notice =
    "Saved data could not be loaded. The original is preserved. Download a recovery copy before resetting sample data.";
else if (loaded.status === "unavailable")
  notice = "Storage is unavailable. Changes will last only for this visit.";

const outlet = (id) => state.outlets.find((o) => o.id === id),
  tank = (id) => state.tanks.find((t) => t.id === id),
  nozzle = (id) => state.nozzles.find((n) => n.id === id);
const badge = (text, type = "neutral") =>
  `<span class="badge ${type}">${esc(text)}</span>`;
const act = (action, label, attrs = "", cls = "btn") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${esc(label)}</button>`;
function openDialog(html) {
  lastFocus = document.activeElement;
  $("#modal").innerHTML = html;
  $("#modal").showModal();
  setTimeout(
    () =>
      $("#modal")
        .querySelector("input:not([type=hidden]),select,button")
        ?.focus(),
    0,
  );
}
function closeDialog() {
  $("#modal").close();
  lastFocus?.focus();
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 4200);
}
function commit(action, input) {
  try {
    const formElement = $("#modal").open ? $("#transaction-form") : null;
    const result = C.apply(state, ctx, action, {
      ...input,
      ...(formElement
        ? { expectedRevision: Number(formElement.dataset.revision) }
        : {}),
    });
    const persisted = repository.write(result.state, observedRaw);
    if (persisted.status === "invalid")
      throw Error(
        "Saved data needs recovery. Download a recovery copy and reset explicitly; no records were overwritten.",
      );
    if (persisted.status === "conflict") {
      if (persisted.state) state = persisted.state;
      observedRaw = persisted.raw;
      render();
      throw Error(
        "Another tab updated the workspace. Close this form and review the latest figures.",
      );
    }
    state = result.state;
    observedRaw = persisted.raw;
    notice =
      persisted.status === "volatile"
        ? "Storage is unavailable. Changes work for this visit only; download a recovery copy before leaving."
        : "";
    closeDialog();
    render();
    $("#main")?.focus();
    toast(result.message);
  } catch (e) {
    const el = $("#modal").open ? $("#form-error") : null;
    if (el) {
      el.textContent = e.message;
      el.focus();
    } else toast(e.message);
  }
}
function downloadRecovery() {
  if (ctx.role !== "Owner") {
    toast("Switch to Owner to export the full demo workspace.");
    return;
  }
  const current = repository.read();
  const payload = {
    format: "forecourt-recovery",
    version: 1,
    exportedAt: new Date().toISOString(),
    storageStatus: current.status,
    workspace: state,
    originalSavedText: current.status === "invalid" ? current.raw : undefined,
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  a.download = "Forecourt-demo-recovery.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Recovery copy downloaded. It contains fictional demo data.");
}

function table(headers, body, empty = "No records in this workspace.") {
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(labels[page])} data table"><table><thead><tr>${headers.map((x) => `<th scope="col">${x || "Actions"}</th>`).join("")}</tr></thead><tbody>${body.length ? body.join("") : `<tr><td colspan="${headers.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`;
}
const row = (cells) =>
  "<tr>" + cells.map((x) => "<td>" + x + "</td>").join("") + "</tr>";
function title(k, desc, buttons = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${ctx.role === "Owner" ? "OWNER’S WORKSPACE" : ctx.role.toUpperCase() + " WORKSPACE"} / ${C.scope(state, ctx) === "all" ? "ALL OUTLETS" : esc(outlet(ctx.outlet).name.toUpperCase())}</div><h1>${labels[k]}</h1><p>${desc}</p></div><div class="heading-actions">${buttons}</div></div>`;
}
function can(action) {
  return action === "approve"
    ? ["Owner", "Accountant"].includes(ctx.role)
    : action === "collect" || action === "expense"
      ? true
      : ctx.role !== "Accountant";
}
function alerts() {
  const a = [];
  C.rows(state, "tanks", ctx).forEach((t) => {
    const b = C.stock(state, t.id);
    if (b < t.reorder)
      a.push({
        title: `${outlet(t.outlet).name}: ${t.fuel.toLowerCase()} running low`,
        detail: `${litres(b)} available · reorder point ${litres(t.reorder)}`,
        page: "tanks",
        type: "amber",
      });
    if (
      t.readingRevision === t.stockRevision &&
      Math.abs(t.physical - b) > 0.001
    )
      a.push({
        title: `${outlet(t.outlet).name}: stock difference`,
        detail: `${litres(t.physical - b)} measured vs book · investigate reading`,
        page: "tanks",
        type: "red",
      });
  });
  C.rows(state, "shifts", ctx)
    .filter((sh) => sh.status === "submitted")
    .forEach((sh) =>
      a.push({
        title: `${outlet(sh.outlet).name}: shift awaiting review`,
        detail: `Cash difference ${money(sh.counted - sh.expected)}`,
        page: "shifts",
        type: "amber",
      }),
    );
  C.rows(state, "receipts", ctx)
    .filter((r) => r.received !== r.invoiced)
    .forEach((r) =>
      a.push({
        title: "Delivery quantity requires follow-up",
        detail: `${r.docket} · ${litres(r.received - r.invoiced)} vs invoice`,
        page: "receipts",
        type: "amber",
      }),
    );
  return a.filter((x) => C.ROLES[ctx.role].includes(x.page));
}
function chart() {
  const selected = C.scope(state, ctx),
    m = C.metrics(state, ctx);
  const factor =
    selected === "all"
      ? 1
      : [0.32, 0.43, 0.25][state.outlets.findIndex((o) => o.id === selected)];
  const values = state.history
    .map((h) => ({ ...h, litres: Math.round(h.litres * factor) }))
    .concat({ label: "02 Nov", litres: m.litres });
  const max = Math.max(...values.map((v) => v.litres), 1) * 1.15;
  return `<div class="bar-chart" role="img" aria-label="Daily fuel volume: ${values.map((v) => v.label + " " + litres(v.litres)).join(", ")}"><div class="chart-scale"><span>${fmt(Math.ceil(max / 1000))}k L</span><span>${fmt(Math.ceil(max / 2000))}k L</span><span>0</span></div><div class="bars">${values.map((v, i) => `<div class="bar-col"><span class="bar-value">${fmt(v.litres / 1000, 1)}k</span><div class="bar-track"><div class="bar ${i === 6 ? "current" : ""}" style="height:${(v.litres / max) * 100}%"><span></span></div></div><span class="bar-label">${v.label}</span></div>`).join("")}</div></div>`;
}
function outletRows() {
  return (
    C.scope(state, ctx) === "all" ? state.outlets : [outlet(ctx.outlet)]
  ).map((o) => {
    const m = C.metrics(state, { role: "Owner", outlet: o.id });
    const short = state.tanks.some(
      (t) => t.outlet === o.id && C.stock(state, t.id) < t.reorder,
    );
    return row([
      `<div class="cell-main"><span class="outlet-symbol">${icon("outlets")}</span><div><strong>${o.name}</strong><small>${o.area}</small></div></div>`,
      money(m.sales),
      litres(m.litres),
      `<div class="mini-progress"><span style="width:${Math.min(100, (m.litres / o.target) * 100)}%"></span></div><small>${fmt((m.litres / o.target) * 100)}% of sample target</small>`,
      short ? badge("Low fuel", "amber") : badge("Stock sufficient", "green"),
      ctx.role === "Owner"
        ? act("outlet", "View", `data-id="${o.id}"`, "text-btn")
        : badge("Your outlet"),
    ]);
  });
}
function overview() {
  const m = C.metrics(state, ctx),
    a = alerts(),
    methods = ["Cash", "UPI", "Card", "Credit"],
    s = C.rows(state, "sales", ctx);
  return (
    title(
      "overview",
      "A clear view of your forecourt. Every outlet, every shift.",
      act("tour", "Presentation guide", "", "btn secondary") +
        (can("sale") ? act("sale", "+ Record sale", "", "btn primary") : ""),
    ) +
    `
 <div class="summary-strip"><span><i class="status-dot"></i> Sample operating day <strong>02 November 2026</strong></span><span>${C.scope(state, ctx) === "all" ? "3 outlets in view" : "1 outlet in view"}<b>·</b>Manual entry prototype</span></div>
 <section class="kpi-grid" aria-label="Business summary"><article class="kpi featured"><div class="kpi-label">Fuel sales value ${icon("sales")}</div><div class="kpi-value">${money(m.sales)}</div><div class="kpi-foot">${litres(m.litres)} dispensed across this workspace</div><div class="spark"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></article><article class="kpi"><div class="kpi-label">Fuel available ${icon("tanks")}</div><div class="kpi-value">${fmt(m.stock)}<small>L</small></div><div class="kpi-foot">${m.low ? badge(m.low + " tank below reorder", "amber") : badge("Above reorder levels", "green")}</div></article><article class="kpi"><div class="kpi-label">Fleet outstanding ${icon("credit")}</div><div class="kpi-value">${money(m.credit)}</div><div class="kpi-foot">Opening dues + credit sales − collections</div></article><article class="kpi"><div class="kpi-label">Indicative fuel margin ${icon("reports")}</div><div class="kpi-value">${money(m.margin)}</div><div class="kpi-foot">Before ${money(m.expenses)} operating expenses</div></article></section>
 <div class="dashboard-grid"><section class="panel trend"><div class="panel-head"><div><h2>Fuel volume</h2><p>Daily sales across your selected outlets</p></div><span class="soft-chip">Last 7 sample days</span></div>${chart()}<div class="chart-note"><span class="legend-dot"></span> Historical sample totals <span class="legend-dot active"></span> Current day, calculated from sales</div></section><section class="panel attention"><div class="panel-head"><h2>Needs your attention</h2><span class="count">${a.length}</span></div>${
   a.length
     ? a
         .slice(0, 3)
         .map(
           (x) =>
             `<button class="alert-row" data-page="${x.page}"><span class="alert-icon ${x.type}">${icon("alert")}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.detail)}</small></span>${icon("chevron")}</button>`,
         )
         .join("")
     : '<div class="empty">No stock or shift exceptions in this workspace.</div>'
 }<button class="panel-link" data-action="exceptions">Review all exceptions ${icon("arrow")}</button></section></div>
 <div class="dashboard-bottom"><section class="panel"><div class="panel-head"><div><h2>Outlet performance</h2><p>Sales and stock health at a glance</p></div>${ctx.role === "Owner" ? '<button class="text-btn" data-page="outlets">View outlets ↗</button>' : ""}</div>${table(["Outlet", "Sales value", "Volume", "Daily target", "Stock status", ""], outletRows())}</section><section class="panel payments"><div class="panel-head"><h2>Sales by payment</h2></div><div class="payment-total">${money(m.sales)}<small>Recorded fuel sales</small></div>${methods
   .map((p, i) => {
     const amt = C.sum(
         s.filter((x) => x.method === p),
         (x) => x.amount,
       ),
       pc = m.sales ? (amt / m.sales) * 100 : 0;
     return `<div class="payment-line"><div><span><i style="background:var(--pay-${i})"></i>${p}</span><strong>${money(amt)}</strong></div><div class="payment-track"><b style="width:${pc}%;background:var(--pay-${i})"></b></div></div>`;
   })
   .join(
     "",
   )}<p class="footnote">Credit is receivable, not a cash collection.</p></section></div>`
  );
}
function outletsPage() {
  return (
    title(
      "outlets",
      "Compare your stations, then open an outlet’s operational workspace.",
    ) +
    `<div class="outlet-cards">${state.outlets
      .map((o, i) => {
        const m = C.metrics(state, { role: "Owner", outlet: o.id });
        return `<article class="panel outlet-card"><div class="station-art"><span>0${i + 1}</span>${icon("sales")}<div class="station-lines"></div></div><div class="outlet-content"><div class="eyebrow">${o.area}</div><h2>${o.name}</h2><p>Station manager · ${o.manager}</p><div class="outlet-stats"><div><small>Fuel sales</small><strong>${money(m.sales)}</strong></div><div><small>Volume sold</small><strong>${litres(m.litres)}</strong></div></div><div class="inline-summary"><span>Book stock</span><strong>${litres(m.stock)}</strong></div><div class="inline-summary"><span>Fleet dues</span><strong>${money(m.credit)}</strong></div>${act("outlet", "Open outlet workspace →", `data-id="${o.id}"`, "btn primary full")}</div></article>`;
      })
      .join(
        "",
      )}</div><div class="note-box">Prototype setup: three fictional outlets. Names, tanks, permissions, accounting rules and integrations will be configured after client discovery.</div>`
  );
}
function salesPage() {
  const rs = C.rows(state, "sales", ctx).filter((r) =>
    (r.id + " " + r.fuel + " " + outlet(r.outlet).name + " " + r.method)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    title(
      "sales",
      "Meter-based sales linked to fuel stock, shift cash and fleet balances.",
      can("sale") ? act("sale", "+ Record meter sale", "", "btn primary") : "",
    ) +
    `<div class="nozzle-grid">${C.rows(state, "nozzles", ctx)
      .map((n) => {
        const t = tank(n.tank);
        return `<div class="panel nozzle-card"><span class="fuel-tag ${t.fuel.toLowerCase()}">${t.fuel}</span><h3>${outlet(n.outlet).name} · ${n.label}</h3><div class="meter">${fmt(C.meter(state, n.id), 3)}<small>L totalizer</small></div><p>Sample selling rate <strong>${rate(t.rate)}/L</strong></p></div>`;
      })
      .join(
        "",
      )}</div><section class="panel"><div class="panel-head"><div><h2>Sales register</h2><p>${rs.length} entries · Amounts use the rate captured at sale</p></div><input id="search" type="search" placeholder="Search outlet, fuel or payment" aria-label="Search sales" value="${esc(query)}"></div>${table(
      [
        "Reference",
        "Outlet / nozzle",
        "Fuel",
        "Meter movement",
        "Volume",
        "Sales value",
        "Payment",
      ],
      [...rs]
        .reverse()
        .map((r) =>
          row([
            `<strong>${r.id}</strong>`,
            `${outlet(r.outlet).name}<small>${nozzle(r.nozzle).label}</small>`,
            badge(r.fuel, r.fuel === "Petrol" ? "green" : "blue"),
            `${fmt(r.opening, 3)} →<br>${fmt(r.closing, 3)}`,
            litres(r.litres),
            money(r.amount),
            badge(r.method, r.method === "Credit" ? "amber" : "neutral"),
          ]),
        ),
    )}</section>`
  );
}
function tanksPage() {
  return (
    title(
      "tanks",
      "Book stock = opening stock + accepted receipts − nozzle sales.",
      can("dip") ? act("dip", "Record tank reading", "", "btn primary") : "",
    ) +
    `<div class="tank-grid">${C.rows(state, "tanks", ctx)
      .map((t) => {
        const book = C.stock(state, t.id),
          pc = (book / t.capacity) * 100,
          fresh = t.readingRevision === t.stockRevision,
          v = t.physical - book;
        return `<article class="panel tank-card"><div class="panel-head"><div><p>${outlet(t.outlet).name}</p><h2>${t.name} · ${t.fuel}</h2></div>${badge(book < t.reorder ? "Reorder fuel" : "Available", book < t.reorder ? "amber" : "green")}</div><div class="tank-body"><div class="tank-vessel"><div class="tank-fill ${t.fuel.toLowerCase()}" style="height:${pc}%"></div><span>${fmt(pc)}<small>% full</small></span><i style="bottom:${(t.reorder / t.capacity) * 100}%"></i></div><div class="tank-values"><small>Book stock</small><h3>${litres(book)}</h3><p>Capacity ${litres(t.capacity)}</p><p>Reorder at ${litres(t.reorder)}</p></div></div><div class="tank-recon"><div><small>Last measured stock</small><strong>${litres(t.physical)}</strong></div><div><small>${fresh ? "Measured − book" : "Reading status"}</small><strong class="${fresh && v < 0 ? "danger-text" : ""}">${fresh ? litres(v) : "New reading needed"}</strong></div></div>${can("dip") ? act("dip", "Record reading", `data-outlet="${t.outlet}" data-id="${t.id}"`, "text-btn") : ""}</article>`;
      })
      .join(
        "",
      )}</div><div class="note-box">Enter measured litres from the outlet’s calibrated tank chart or approved gauge. This prototype does not convert dip height, correct for temperature, or diagnose leaks. A variance prompts investigation; it does not automatically adjust stock.</div>`
  );
}
function receiptsPage() {
  return (
    title(
      "receipts",
      "Compare delivery paperwork with the quantity accepted into the tank.",
      can("receipt") ? act("receipt", "+ Receive fuel", "", "btn primary") : "",
    ) +
    `<section class="panel">${table(
      [
        "Reference / supplier",
        "Outlet",
        "Tank / fuel",
        "Invoiced",
        "Accepted",
        "Difference",
      ],
      C.rows(state, "receipts", ctx)
        .slice()
        .reverse()
        .map((r) =>
          row([
            `<strong>${esc(r.docket)}</strong><small>${esc(r.supplier)}</small>`,
            outlet(r.outlet).name,
            `${tank(r.tank).name} · ${tank(r.tank).fuel}`,
            litres(r.invoiced),
            litres(r.received),
            badge(
              litres(r.received - r.invoiced),
              r.received === r.invoiced ? "green" : "amber",
            ),
          ]),
        ),
    )}</section><div class="note-box">Accepted volume updates book stock once. Duplicate delivery references and quantities exceeding configured tank capacity are blocked. Quantities are illustrative ambient litres; commercial loss and temperature rules need client confirmation.</div>`
  );
}
function shiftsPage() {
  return (
    title(
      "shifts",
      "Count the cash, explain differences and review before locking a shift.",
      can("start") ? act("start", "Open next shift", "", "btn secondary") : "",
    ) +
    `<div class="shift-grid">${C.rows(state, "shifts", ctx)
      .map((sh) => {
        const expected = C.expectedCash(state, sh.id),
          sales = C.sum(
            state.sales.filter((r) => r.shift === sh.id && r.method === "Cash"),
            (r) => r.amount,
          ),
          collections = C.sum(
            state.collections.filter(
              (r) => r.shift === sh.id && r.method === "Cash",
            ),
            (r) => r.amount,
          ),
          expenses = C.sum(
            state.expenses.filter(
              (r) => r.shift === sh.id && r.method === "Cash",
            ),
            (r) => r.amount,
          );
        return `<article class="panel shift-card"><div class="panel-head"><div><p>${outlet(sh.outlet).name}</p><h2>${esc(sh.name)}</h2></div>${badge(sh.status, sh.status === "approved" ? "green" : sh.status === "submitted" ? "amber" : "blue")}</div><div class="shift-content"><div class="inline-summary"><span>Opening float</span><strong>${money(sh.float)}</strong></div><div class="inline-summary"><span>+ Cash fuel sales</span><strong>${money(sales)}</strong></div><div class="inline-summary"><span>+ Cash fleet collections</span><strong>${money(collections)}</strong></div><div class="inline-summary"><span>− Cash expenses</span><strong>${money(expenses)}</strong></div><div class="cash-total"><span>Expected cash</span><strong>${money(expected)}</strong></div>${sh.counted !== null ? `<div class="inline-summary"><span>Counted cash</span><strong>${money(sh.counted)}</strong></div><div class="inline-summary"><span>Cash difference</span>${badge(money(sh.counted - expected), sh.counted === expected ? "green" : "red")}</div><p class="footnote">${esc(sh.note || "No difference reported")}${sh.submittedBy ? " · Submitted by " + sh.submittedBy : ""}</p>` : ""}<div class="button-row">${sh.status === "open" && can("close") ? act("close", "Count & close shift", `data-outlet="${sh.outlet}"`, "btn primary full") : ""}${sh.status === "submitted" && can("approve") ? act("approve", "Approve", `data-outlet="${sh.outlet}" data-id="${sh.id}"`, "btn primary") + act("reopen", "Return for correction", `data-outlet="${sh.outlet}" data-id="${sh.id}"`, "btn secondary") : ""}${sh.status === "approved" ? '<span class="locked">✓ Closing record locked</span>' : ""}</div></div></article>`;
      })
      .join(
        "",
      )}</div><div class="note-box">Submit as Station manager and review as Owner or Accountant. Demo roles simulate independent review; production requires individual staff accounts and enforced access controls.</div>`
  );
}
function creditPage() {
  return (
    title(
      "credit",
      "Keep fleet sales and collections connected to each outlet.",
      act("collect", "+ Record collection", "", "btn primary"),
    ) +
    `<section class="panel">${table(
      [
        "Fleet account",
        "Outlet",
        "Opening dues",
        "Today’s credit sales",
        "Collections",
        "Outstanding",
        "",
      ],
      C.rows(state, "customers", ctx).map((c) =>
        row([
          `<strong>${esc(c.name)}</strong><small>Opening dues dated ${c.due} · Sample limit ${money(c.limit)}</small>`,
          outlet(c.outlet).name,
          money(c.opening),
          money(
            C.sum(
              state.sales.filter((r) => r.customer === c.id),
              (r) => r.amount,
            ),
          ),
          money(
            C.sum(
              state.collections.filter((r) => r.customer === c.id),
              (r) => r.amount,
            ),
          ),
          `<strong>${money(C.balance(state, c.id))}</strong>`,
          act(
            "collect",
            "Collect",
            `data-outlet="${c.outlet}" data-id="${c.id}"`,
            "text-btn",
          ),
        ]),
      ),
    )}</section><section class="panel section-gap"><div class="panel-head"><h2>Collection history</h2></div>${table(
      ["Receipt", "Customer", "Outlet", "Method", "Amount"],
      C.rows(state, "collections", ctx)
        .slice()
        .reverse()
        .map((r) =>
          row([
            r.id,
            esc(state.customers.find((c) => c.id === r.customer).name),
            outlet(r.outlet).name,
            badge(r.method),
            money(r.amount),
          ]),
        ),
      "No collections yet. Record a sample payment to reduce fleet outstanding.",
    )}</section>`
  );
}
function expensesPage() {
  return (
    title(
      "expenses",
      "Track station spending and its effect on cash available.",
      act("expense", "+ Record expense", "", "btn primary"),
    ) +
    `<section class="panel">${table(
      ["Reference", "Outlet", "Category", "Description", "Payment", "Amount"],
      C.rows(state, "expenses", ctx)
        .slice()
        .reverse()
        .map((e) =>
          row([
            e.id,
            outlet(e.outlet).name,
            esc(e.category),
            esc(e.note),
            badge(e.method),
            money(e.amount),
          ]),
        ),
    )}</section>`
  );
}
function maintenancePage() {
  return (
    title(
      "maintenance",
      "A simple service checklist for each outlet’s team.",
      act("task", "+ Add task", "", "btn primary"),
    ) +
    `<section class="panel">${table(
      ["Task", "Outlet", "Due date", "Status", ""],
      C.rows(state, "tasks", ctx).map((t) =>
        row([
          `<strong>${esc(t.title)}</strong>`,
          outlet(t.outlet).name,
          t.due,
          badge(
            t.status === "Done"
              ? "Completed"
              : t.due <= C.DAY
                ? "Due for review"
                : "Scheduled",
            t.status === "Done" ? "green" : t.due <= C.DAY ? "amber" : "blue",
          ),
          t.status === "Open"
            ? act(
                "complete",
                "Mark complete",
                `data-id="${t.id}" data-outlet="${t.outlet}"`,
                "text-btn",
              )
            : "✓",
        ]),
      ),
    )}</section><div class="note-box">Sample service reminders only. No inspection, certificate validity or statutory compliance is verified by this prototype.</div>`
  );
}
function reportsPage() {
  const m = C.metrics(state, ctx);
  return (
    title(
      "reports",
      "Export the current workspace or print an owner summary.",
      act("print", "Print summary", "", "btn secondary") +
        act("export", "Download sales CSV", "", "btn primary"),
    ) +
    `<section class="panel report"><div class="report-heading"><div class="brand-print">FORECOURT / DAILY SUMMARY</div><h2>${C.scope(state, ctx) === "all" ? "All outlets" : outlet(ctx.outlet).name}</h2><p>02 November 2026 · Illustrative sample figures</p></div>${table(
      ["Measure", "Value"],
      [
        ["Fuel sales", money(m.sales)],
        ["Volume sold", litres(m.litres)],
        ["Indicative fuel margin before expenses", money(m.margin)],
        ["Recorded operating expenses", money(m.expenses)],
        [
          "Margin less recorded expenses (not net profit)",
          money(m.margin - m.expenses),
        ],
        ["Book fuel inventory", litres(m.stock)],
        ["Fleet outstanding", money(m.credit)],
      ].map(row),
    )}<div class="panel-head"><h2>Outlet breakdown</h2></div>${table(["Outlet", "Sales value", "Volume", "Daily target", "Stock status", ""], outletRows())}<p class="footnote report-note">Sales and margin are based on illustrative prices and landed fuel costs. This is not a tax statement, audited account or net-profit calculation. Overheads, taxes, depreciation, shortages and bank settlement timing are not fully modelled.</p></section>`
  );
}
function activityPage() {
  return (
    title("activity", "A readable trail of changes made during the demo.") +
    `<section class="panel">${table(
      ["Recorded at", "Outlet", "Demo role", "Action"],
      C.rows(state, "audit", ctx).map((a) =>
        row([
          new Date(a.time).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          a.outlet === "all" ? "All outlets" : outlet(a.outlet).name,
          badge(a.role),
          esc(a.text),
        ]),
      ),
    )}</section><div class="note-box">Activity is stored on this browser. It is not an immutable production audit log.</div>`
  );
}
const views = {
  overview,
  outlets: outletsPage,
  sales: salesPage,
  tanks: tanksPage,
  receipts: receiptsPage,
  shifts: shiftsPage,
  credit: creditPage,
  expenses: expensesPage,
  maintenance: maintenancePage,
  reports: reportsPage,
  activity: activityPage,
};
function render() {
  document.title = labels[page] + " | Forecourt";
  if (!C.ROLES[ctx.role].includes(page)) page = "overview";
  const count = alerts().length;
  $("#app").innerHTML =
    `<aside class="sidebar ${menu ? "open" : ""}"><a class="brand" href="#overview" data-page="overview" aria-label="Forecourt overview"><span class="brand-mark">F<span></span></span><span>forecourt<small>RETAIL OPERATIONS</small></span></a><div class="workspace-label">WORKSPACE</div><nav id="primary-nav" aria-label="Main navigation">${C.ROLES[ctx.role].map((p, i) => `${i === 1 ? '<div class="nav-label">OPERATIONS</div>' : i === 8 ? '<div class="nav-label">MANAGEMENT</div>' : ""}<button data-page="${p}" class="nav-item ${page === p ? "selected" : ""}" ${page === p ? 'aria-current="page"' : ""}>${icon(p)}<span>${labels[p]}</span>${p === "tanks" && count ? '<i class="nav-pip"></i>' : ""}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="demo-mark"><span class="status-dot"></span> CLIENT PRESENTATION</div><p>Fictional outlets & sample data.<br>Saved on this browser.</p><button class="sidebar-help" data-action="tour">Presentation guide ${icon("arrow")}</button></div></aside><div class="shell"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-controls="primary-nav" aria-expanded="${menu}">${icon("menu")}</button><span class="breadcrumb">Workspace <span>/</span> ${labels[page]}</span></div><div class="top-controls"><label class="select-wrap">${icon("outlets")}<span class="sr-only">Outlet</span><select id="outlet-select" aria-label="Outlet">${ctx.role === "Owner" ? `<option value="all" ${ctx.outlet === "all" ? "selected" : ""}>All outlets</option>` : ""}${state.outlets.map((o) => `<option value="${o.id}" ${ctx.outlet === o.id ? "selected" : ""}>${o.name}</option>`).join("")}</select></label><span class="top-divider"></span><div class="avatar">${ctx.role === "Owner" ? "OW" : ctx.role === "Manager" ? "SM" : "AC"}</div><label class="role-label"><span>Demo role</span><select id="role-select" aria-label="Demo role">${Object.keys(
      C.ROLES,
    )
      .map(
        (r) =>
          `<option value="${r}" ${ctx.role === r ? "selected" : ""}>${r === "Manager" ? "Station manager" : r}</option>`,
      )
      .join(
        "",
      )}</select></label></div></header><main id="main" tabindex="-1">${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ""}${views[page]()}</main><footer class="workspace-footer"><span>FORECOURT <b>·</b> Multi-outlet management prototype</span><div><span>No live dispenser or bank connections</span>${ctx.role === "Owner" ? '<button data-action="backup">Download recovery copy</button>' : ""}<button data-action="reset">Reset sample data</button></div></footer></div>`;
}
function outletOptions(selected) {
  const options = ctx.role === "Owner" ? state.outlets : [outlet(ctx.outlet)];
  return options
    .map(
      (o) =>
        `<option value="${o.id}" ${o.id === selected ? "selected" : ""}>${o.name}</option>`,
    )
    .join("");
}
const field = (label, name, type = "text", value = "", extra = "") =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
function form(action, selected, id) {
  const o =
    selected || (ctx.outlet === "all" ? state.outlets[0].id : ctx.outlet);
  const titleMap = {
    sale: "Record a meter sale",
    receipt: "Receive fuel delivery",
    dip: "Record measured tank stock",
    close: "Count & close shift",
    start: "Open the next shift",
    collect: "Record a fleet collection",
    expense: "Record an expense",
    task: "Add a maintenance task",
  };
  openDialog(
    `<form id="transaction-form" data-kind="${action}" data-revision="${state.revision}" aria-describedby="form-error"><div class="modal-head"><div><div class="eyebrow">${action === "close" ? "CASH RECONCILIATION" : "NEW RECORD"}</div><h2 id="modal-title">${titleMap[action]}</h2></div><button type="button" class="icon-btn" data-action="dismiss" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-body"><label class="field">Outlet<select name="outlet" id="form-outlet">${outletOptions(o)}</select></label><div id="dependent-fields"></div><p class="form-error" id="form-error" role="alert" tabindex="-1"></p></div><div class="modal-footer"><button type="button" data-action="dismiss" class="btn secondary">Cancel</button><button class="btn primary" type="submit">${action === "close" ? "Submit for review" : "Save record"}</button></div></form>`,
  );
  formFields(action, o, id);
}
function formFields(action, o, id) {
  const ts = state.tanks.filter((t) => t.outlet === o),
    ns = state.nozzles.filter((n) => n.outlet === o),
    cs = state.customers.filter((c) => c.outlet === o),
    sh = state.shifts.find((x) => x.outlet === o && x.status === "open");
  const select = (label, name, options) =>
    `<label class="field">${label}<select name="${name}">${options}</select></label>`;
  const tankSelect = select(
    "Tank / fuel",
    "tank",
    ts
      .map(
        (t) =>
          `<option value="${t.id}" ${id === t.id ? "selected" : ""}>${t.name} · ${t.fuel}</option>`,
      )
      .join(""),
  );
  const customers = select(
    "Fleet customer",
    "customer",
    cs
      .map(
        (c) =>
          `<option value="${c.id}" ${id === c.id ? "selected" : ""}>${esc(c.name)}</option>`,
      )
      .join(""),
  );
  const methods = (opts) =>
    select(
      "Payment method",
      "method",
      opts.map((p) => `<option>${p}</option>`).join(""),
    );
  let html = "";
  if (action === "sale")
    html =
      select(
        "Nozzle",
        "nozzle",
        ns
          .map(
            (n) =>
              `<option value="${n.id}">${n.label} · ${tank(n.tank).fuel}</option>`,
          )
          .join(""),
      ) +
      '<div id="meter-hint" class="form-callout"></div>' +
      field(
        "Closing meter reading (L)",
        "closing",
        "number",
        "",
        'min="0" step="0.001" required',
      ) +
      methods(["Cash", "UPI", "Card", "Credit"]) +
      `<div id="customer-field" hidden>${customers}</div><p class="footnote">One entry records a meter increment assigned to one payment method. Production shift entry will support split tenders, testing returns and price changes.</p>`;
  if (action === "receipt")
    html =
      tankSelect +
      field(
        "Delivery reference",
        "docket",
        "text",
        "",
        'required maxlength="80" placeholder="e.g. DEMO-7822"',
      ) +
      field(
        "Supplier / depot",
        "supplier",
        "text",
        "",
        'required maxlength="120"',
      ) +
      '<div class="form-grid">' +
      field(
        "Invoiced quantity (L)",
        "invoiced",
        "number",
        "",
        'min="0.001" step="0.001" required',
      ) +
      field(
        "Accepted quantity (L)",
        "received",
        "number",
        "",
        'min="0.001" step="0.001" required',
      ) +
      "</div>" +
      field("Delivery note (optional)", "note", "text", "", 'maxlength="160"') +
      '<p class="footnote">Accepted litres are added to book stock. Receipt does not create a supplier payment.</p>';
  if (action === "dip")
    html =
      tankSelect +
      '<div id="dip-hint" class="form-callout"></div>' +
      field(
        "Measured volume (L)",
        "physical",
        "number",
        "",
        'min="0" step="0.001" required',
      ) +
      '<p class="footnote">Use an approved calibrated measurement. This records a variance without changing book stock.</p>';
  if (action === "close")
    html = sh
      ? `<div class="form-callout">${esc(sh.name)}<br>Expected cash <strong>${money(C.expectedCash(state, sh.id))}</strong></div>` +
        field(
          "Cash physically counted (₹)",
          "counted",
          "number",
          "",
          'min="0" step="0.01" required',
        ) +
        field(
          "Reason for any difference",
          "note",
          "text",
          "",
          'maxlength="160" placeholder="Required if counted cash differs"',
        ) +
        '<p class="footnote">Submitting locks new sales, collections and expenses until review or return for correction.</p>'
      : '<p class="notice">No open shift at this outlet. Review the previous shift or open the next one.</p>';
  if (action === "start")
    html =
      field(
        "Shift name",
        "name",
        "text",
        "Shift B · 14:00–22:00",
        'required maxlength="80"',
      ) +
      field(
        "Opening cash float (₹)",
        "float",
        "number",
        "1000",
        'min="0" step="0.01" required',
      ) +
      '<p class="footnote">The previous shift must be approved. Nozzle meters continue from the last recorded sale.</p>';
  if (action === "collect")
    html =
      customers +
      '<div id="credit-hint" class="form-callout"></div>' +
      field(
        "Amount received (₹)",
        "amount",
        "number",
        "",
        'min="0.01" step="0.01" required',
      ) +
      methods(["Bank", "UPI", "Cash", "Card"]);
  if (action === "expense")
    html =
      select(
        "Expense category",
        "category",
        ["Station supplies", "Electricity", "Repairs", "Staff welfare", "Other"]
          .map((p) => `<option>${p}</option>`)
          .join(""),
      ) +
      field(
        "Amount paid (₹)",
        "amount",
        "number",
        "",
        'min="0.01" step="0.01" required',
      ) +
      methods(["Cash", "Bank", "UPI", "Card"]) +
      field("Description", "note", "text", "", 'required maxlength="160"');
  if (action === "task")
    html =
      field(
        "Task description",
        "title",
        "text",
        "",
        'required maxlength="160"',
      ) + field("Due date", "due", "date", C.DAY, "required");
  $("#dependent-fields").innerHTML = html;
  updateHints();
}
function updateHints() {
  const f = $("#transaction-form");
  if (!f) return;
  const read = (name) => f.querySelector(`[name="${name}"]`)?.value;
  if ($("#meter-hint")) {
    const n = nozzle(read("nozzle")),
      t = tank(n.tank),
      v = Number(read("closing")),
      qty = C.round(v - C.meter(state, n.id));
    $("#meter-hint").innerHTML =
      `Previous reading <strong>${fmt(C.meter(state, n.id), 3)} L</strong><br>Sample rate ${rate(t.rate)}/L${qty > 0 ? `<br>This entry: <strong>${litres(qty)} · ${money(Math.round(qty * t.rate))}</strong>` : ""}`;
    $("#customer-field").hidden = read("method") !== "Credit";
  }
  if ($("#dip-hint"))
    $("#dip-hint").textContent =
      "Current book stock: " + litres(C.stock(state, read("tank")));
  if ($("#credit-hint"))
    $("#credit-hint").textContent =
      "Outstanding: " + money(C.balance(state, read("customer")));
}
function exportSales() {
  const rs = C.rows(state, "sales", ctx);
  const lines = [
    [
      "Reference",
      "Outlet",
      "Fuel",
      "Nozzle",
      "Opening meter L",
      "Closing meter L",
      "Litres",
      "Rate INR per L",
      "Sales INR",
      "Method",
      "Dataset",
    ],
    ...rs.map((r) => [
      r.id,
      outlet(r.outlet).name,
      r.fuel,
      nozzle(r.nozzle).label,
      r.opening,
      r.closing,
      r.litres,
      (r.rate / 100).toFixed(2),
      (r.amount / 100).toFixed(2),
      r.method,
      "Fictional demo",
    ]),
  ];
  const csv =
    "\uFEFF" +
    lines
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "Forecourt-" + C.scope(state, ctx) + "-sample-sales.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Sales CSV downloaded for the selected workspace");
}
function info(title, body) {
  openDialog(
    `<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-btn" data-action="dismiss" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-body">${body}</div><div class="modal-footer">${act("dismiss", "Done", "", "btn primary")}</div>`,
  );
}
function showTour() {
  info(
    "A 7-minute owner walkthrough",
    `<p class="intro">Lead with the business questions: where is the cash, where is the fuel, and which outlet needs attention?</p><ol class="tour-list"><li><strong>One view of every outlet</strong><p>Start at Overview as Owner / All outlets. Compare sales, fuel availability and fleet dues.</p></li><li><strong>Spot stock issues</strong><p>Open Tank inventory. Highway Junction diesel is below its reorder point. Central and Highway diesel show measured stock differences.</p></li><li><strong>Demonstrate a connected sale</strong><p>Record a nozzle sale: add 100 L to the previous meter reading and choose Cash. Sales rise, book stock falls and expected shift cash rises.</p></li><li><strong>Receive a tanker</strong><p>Receive 5,000 L into Highway diesel using a unique delivery reference. Record a new measured stock reading after the movement.</p></li><li><strong>Reconcile cash</strong><p>Switch to Station manager, count and submit a shift with a ₹200 shortfall and a reason. Switch to Owner to review and approve.</p></li><li><strong>Recover fleet dues</strong><p>At another open outlet, record a ₹10,000 bank collection. Outstanding credit reduces without increasing shift cash.</p></li><li><strong>Take away a report</strong><p>Switch to Owner, select All outlets and download the sales CSV from Reports.</p></li></ol><div class="note-box">All figures, rates, outlets and proposed workflows are illustrative. No client requirements have yet been verified. This prototype stores changes locally and has no real authentication or device integrations.</div>`,
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-page],[data-action]");
  if (!b) return;
  if (b.dataset.page) {
    page = b.dataset.page;
    query = "";
    menu = false;
    render();
    $("#main")?.focus();
    window.scrollTo(0, 0);
    return;
  }
  const a = b.dataset.action,
    o = b.dataset.outlet,
    id = b.dataset.id;
  if (
    [
      "sale",
      "receipt",
      "dip",
      "close",
      "start",
      "collect",
      "expense",
      "task",
    ].includes(a)
  ) {
    form(a, o, id);
    return;
  }
  if (a === "dismiss") closeDialog();
  if (a === "outlet") {
    ctx.outlet = id;
    page = "overview";
    render();
    window.scrollTo(0, 0);
  }
  if (a === "menu") {
    menu = !menu;
    render();
  }
  if (a === "backup") downloadRecovery();
  if (a === "tour") showTour();
  if (a === "export") exportSales();
  if (a === "print") window.print();
  if (a === "approve" || a === "reopen" || a === "complete")
    commit(a, { outlet: o, shift: id, task: id });
  if (a === "exceptions") {
    info(
      "Stock & shift exceptions",
      alerts()
        .map(
          (x) =>
            `<div class="exception-detail"><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><button class="text-btn" data-action="go-exception" data-target="${x.page}">Open ${labels[x.page]} →</button></div>`,
        )
        .join("") || "<p>No exceptions in this workspace.</p>",
    );
  }
  if (a === "go-exception") {
    closeDialog();
    page = b.dataset.target;
    render();
  }
  if (a === "reset")
    info(
      "Reset this presentation?",
      `<p>This replaces the sample transactions saved on this browser. Export any demo results you want to keep first.</p>${act("confirm-reset", "Restore original sample data", "", "btn danger")}`,
    );
  if (a === "confirm-reset") {
    const current = repository.read(),
      fresh = C.seed();
    fresh.revision = Math.max(state.revision, current.state?.revision || 0) + 1;
    const result = repository.write(fresh, current.raw, {
      replaceInvalid: true,
    });
    if (result.status === "conflict") {
      toast("Saved data changed again. Review it and retry the reset.");
      return;
    }
    state = fresh;
    observedRaw = result.raw;
    notice =
      result.status === "volatile"
        ? "Storage is unavailable. This reset applies only to this visit."
        : "";
    closeDialog();
    render();
    $("#main")?.focus();
    toast("Original meeting data restored");
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "role-select") {
    ctx.role = e.target.value;
    if (ctx.role !== "Owner" && ctx.outlet === "all")
      ctx.outlet = state.outlets[0].id;
    page = "overview";
    query = "";
    render();
  } else if (e.target.id === "outlet-select") {
    ctx.outlet = e.target.value;
    query = "";
    render();
  } else if (e.target.id === "form-outlet") {
    formFields($("#transaction-form").dataset.kind, e.target.value);
  } else if (e.target.closest("#transaction-form")) updateHints();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    $("#search").focus();
    $("#search").setSelectionRange?.(pos, pos);
  } else if (e.target.closest("#transaction-form")) updateHints();
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "transaction-form") return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  commit(e.target.dataset.kind, data);
});
window.addEventListener("storage", (e) => {
  if (e.key !== C.KEY && e.key !== null) return;
  const current = repository.read();
  if (current.status === "ok") {
    state = current.state;
    observedRaw = current.raw;
    render();
    toast(
      "Workspace refreshed from another tab. Reopen any transaction form before saving.",
    );
  } else {
    notice =
      "Saved data changed in another tab and needs review. Download a recovery copy before resetting.";
    render();
  }
});
$("#modal").addEventListener("cancel", () => {
  lastFocus?.focus();
});
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) closeDialog();
});
render();
window.ForecourtReady = true;
