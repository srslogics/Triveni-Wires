"use strict";
function workflowPage(kind) {
  const ops = C.rows(state, "operations", ctx),
    finance = ["Owner", "Accountant"].includes(ctx.role),
    station = ctx.role !== "Accountant";
  if (kind === "testing")
    return (
      title(
        kind,
        "Test fuel advances the totalizer without creating sales. Returns restore tank stock.",
        station
          ? act("nozzleTest", "Record nozzle test", "", "btn primary")
          : "",
      ) +
      `<section class="panel">${table(
        [
          "Test / outlet",
          "Nozzle / shift",
          "Withdrawn",
          "Returned",
          "Unreturned",
          "Action",
        ],
        ops
          .filter((r) => r.kind === "nozzleTest")
          .map((r) =>
            row([
              `${r.id}<small>${esc(outlet(r.outlet).name)}</small>`,
              `${esc(nozzle(r.nozzle).label)}<small>${esc(r.shift)}</small>`,
              litres(r.litres),
              litres(C.Ops.returned(state, r.id)),
              litres(C.round(r.litres - C.Ops.returned(state, r.id))),
              station
                ? act(
                    "testReturn",
                    "Record return",
                    `data-id="${r.id}" data-outlet="${r.outlet}"`,
                    "text-btn",
                  )
                : "—",
            ]),
          ),
      )}</section><div class="note-box">Measured test volumes and actual returned volumes are entered separately. Unreturned fuel remains deducted from stock and is not treated as a sale. Test/return entry requires the original shift to remain open.</div>`
    );
  if (kind === "settlements") {
    const lines = C.rows(state, "sales", ctx).flatMap((s) =>
      ["UPI", "Card"]
        .filter((m) => C.tender(s, m) > 0)
        .map((method) => ({
          sale: s,
          method,
          match: ops.find(
            (r) =>
              r.kind === "settlement" && r.sale === s.id && r.method === method,
          ),
        })),
    );
    return (
      title(
        kind,
        "Match recorded digital fuel sales to a manually entered bank settlement.",
        finance
          ? act("settlement", "Reconcile bank receipt", "", "btn primary")
          : "",
      ) +
      `<section class="panel">${table(
        [
          "Outlet / sale",
          "Tender",
          "Gross sales",
          "Fees",
          "Bank received",
          "Difference",
          "Status",
        ],
        lines.map(({ sale: s, method, match: m }) =>
          row([
            `${esc(outlet(s.outlet).name)}<small>${s.id}</small>`,
            method,
            money(C.tender(s, method)),
            m ? money(m.fee) : "—",
            m ? money(m.received) : "—",
            m ? money(m.difference) : "—",
            m
              ? badge(
                  m.difference === 0 ? "Matched" : "Exception",
                  m.difference === 0 ? "green" : "amber",
                )
              : badge("Pending"),
          ]),
        ),
      )}</section><div class="note-box">Expected bank receipt = gross tender − recorded fees. Matching does not create another sale or cash-in-drawer entry. This is manual reconciliation; no bank statement feed is connected. A mismatch remains visible for investigation.</div>`
    );
  }
  if (kind === "suppliers") {
    const bills = ops.filter((r) => r.kind === "supplierBill");
    return (
      title(
        kind,
        "Book supplier bills against fuel receipts and record bank payments.",
        finance
          ? act("supplierBill", "Book supplier bill", "", "btn primary")
          : "",
      ) +
      `<section class="panel">${table(
        [
          "Supplier / bill",
          "Outlet / receipt",
          "Bill total",
          "Paid by bank",
          "Outstanding",
          "Action",
        ],
        bills.map((r) =>
          row([
            `<strong>${esc(r.supplier)}</strong><small>${esc(r.reference)}</small>`,
            `${esc(outlet(r.outlet).name)}<small>${r.receipt}</small>`,
            money(r.amount),
            money(C.Ops.paid(state, r.id)),
            money(r.amount - C.Ops.paid(state, r.id)),
            finance
              ? act(
                  "supplierPay",
                  "Record payment",
                  `data-id="${r.id}" data-outlet="${r.outlet}"`,
                  "text-btn",
                )
              : "—",
          ]),
        ),
      )}</section><section class="panel section-gap"><div class="panel-head"><h2>Bank payment register</h2></div>${table(
        ["Payment", "Outlet", "Bank reference", "Bill", "Amount"],
        ops
          .filter((r) => r.kind === "supplierPay")
          .map((r) =>
            row([
              r.id,
              esc(outlet(r.outlet).name),
              esc(r.reference),
              r.bill,
              money(r.amount),
            ]),
          ),
      )}</section><div class="note-box">Fuel stock was posted at receipt. Booking a bill does not post stock again. Payments reduce the bill balance; only Bank payments are demonstrated here. Bill totals are entered from the supplier document; taxes and statutory accounting are not calculated.</div>`
    );
  }
  return (
    title(
      kind,
      "Record the people and cash involved in an open-shift handover.",
      station
        ? act("handover", "Record staff handover", "", "btn primary")
        : "",
    ) +
    `<section class="panel">${table(
      [
        "Outlet / shift",
        "From → to",
        "Expected cash",
        "Handed-over cash",
        "Difference",
        "Note",
      ],
      ops
        .filter((r) => r.kind === "handover")
        .map((r) =>
          row([
            `${esc(outlet(r.outlet).name)}<small>${esc(r.shift)}</small>`,
            `${esc(r.outgoing)} → ${esc(r.incoming)}`,
            money(r.expected),
            money(r.counted),
            badge(
              money(r.counted - r.expected),
              r.counted === r.expected ? "green" : "amber",
            ),
            esc(r.note),
          ]),
        ),
    )}</section><div class="note-box">Handover records a cash snapshot and staff names; it does not reset the float, create a sale or close the shift. Use Shift reconciliation for final closing and independent review. Staff names and roles are presentation simulations, not authenticated staff signatures.</div>`
  );
}
function workflowFields(action, o, id) {
  const select = (label, name, items) =>
    `<label class="field">${label}<select name="${name}">${items.length ? items.map((x) => `<option value="${esc(x.value)}" ${x.value === id ? "selected" : ""}>${esc(x.label)}</option>`).join("") : '<option value="">No eligible records</option>'}</select></label>`;
  const ops = (state.operations || []).filter((r) => r.outlet === o),
    sh = state.shifts.find((s) => s.outlet === o && s.status === "open");
  if (action === "nozzleTest")
    return (
      select(
        "Nozzle",
        "nozzle",
        state.nozzles
          .filter((n) => n.outlet === o)
          .map((n) => ({
            value: n.id,
            label: n.label + " · " + tank(n.tank).fuel,
          })),
      ) +
      field(
        "Fuel drawn for testing (L)",
        "litres",
        "number",
        "5",
        'min="0.001" max="50" step="0.001" required',
      ) +
      field(
        "Test reason",
        "note",
        "text",
        "Routine measure check (sample)",
        'required maxlength="160"',
      ) +
      '<p class="footnote">The meter advances by this measured volume. Record the return separately after fuel is returned to the tank.</p>'
    );
  if (action === "testReturn")
    return (
      select(
        "Test from current open shift",
        "test",
        ops
          .filter(
            (r) =>
              r.kind === "nozzleTest" &&
              r.shift === sh?.id &&
              r.litres - C.Ops.returned(state, r.id) > 0.000001,
          )
          .map((r) => ({
            value: r.id,
            label:
              r.id +
              " · unreturned " +
              litres(C.round(r.litres - C.Ops.returned(state, r.id))),
          })),
      ) +
      field(
        "Fuel actually returned (L)",
        "litres",
        "number",
        "",
        'min="0.001" max="50" step="0.001" required',
      )
    );
  if (action === "settlement")
    return (
      select(
        "Sale",
        "sale",
        state.sales
          .filter(
            (r) =>
              r.outlet === o && (C.tender(r, "UPI") || C.tender(r, "Card")),
          )
          .map((r) => ({
            value: r.id,
            label: r.id + " · " + r.fuel + " · " + money(r.amount),
          })),
      ) +
      select("Tender", "method", [
        { value: "UPI", label: "UPI" },
        { value: "Card", label: "Card" },
      ]) +
      '<div id="settlement-hint" class="form-callout"></div>' +
      field(
        "Bank reference",
        "reference",
        "text",
        "",
        'required maxlength="160"',
      ) +
      field(
        "Settlement fees (INR)",
        "fee",
        "number",
        "0",
        'min="0" step="0.01" required',
      ) +
      field(
        "Bank amount received (INR)",
        "received",
        "number",
        "",
        'min="0" step="0.01" required',
      )
    );
  if (action === "supplierBill")
    return (
      select(
        "Fuel receipt",
        "receipt",
        state.receipts
          .filter(
            (r) =>
              r.outlet === o &&
              !ops.some((b) => b.kind === "supplierBill" && b.receipt === r.id),
          )
          .map((r) => ({ value: r.id, label: r.docket + " · " + r.supplier })),
      ) +
      field(
        "Supplier bill number",
        "reference",
        "text",
        "",
        'required maxlength="160"',
      ) +
      field(
        "Total payable per supplier bill (INR)",
        "amount",
        "number",
        "",
        'min="0.01" step="0.01" required',
      )
    );
  if (action === "supplierPay")
    return (
      select(
        "Unpaid supplier bill",
        "bill",
        ops
          .filter(
            (r) =>
              r.kind === "supplierBill" && r.amount > C.Ops.paid(state, r.id),
          )
          .map((r) => ({
            value: r.id,
            label:
              r.reference +
              " · due " +
              money(r.amount - C.Ops.paid(state, r.id)),
          })),
      ) +
      field(
        "Bank payment reference",
        "reference",
        "text",
        "",
        'required maxlength="160"',
      ) +
      field(
        "Amount paid by bank (INR)",
        "amount",
        "number",
        "",
        'min="0.01" step="0.01" required',
      )
    );
  if (action === "handover")
    return (
      field(
        "Outgoing operator",
        "outgoing",
        "text",
        outlet(o).manager,
        'required maxlength="160"',
      ) +
      field(
        "Incoming operator",
        "incoming",
        "text",
        "",
        'required maxlength="160"',
      ) +
      `<div class="form-callout">Expected shift cash: <strong>${sh ? money(C.expectedCash(state, sh.id)) : "No open shift"}</strong></div>` +
      field(
        "Cash physically handed over (INR)",
        "counted",
        "number",
        "",
        'min="0" step="0.01" required',
      ) +
      field(
        "Handover note / difference reason",
        "note",
        "text",
        "",
        'required maxlength="160"',
      )
    );
  return null;
}
function workflowHints() {
  const f = $("#transaction-form");
  if (!f) return;
  if ($("#settlement-hint")) {
    const r = state.sales.find(
        (r) => r.id === f.querySelector('[name="sale"]').value,
      ),
      method = f.querySelector('[name="method"]').value,
      fee = Number(f.querySelector('[name="fee"]').value || 0);
    $("#settlement-hint").textContent =
      "Gross " +
      method +
      ": " +
      money(r ? C.tender(r, method) : 0) +
      " · Expected net: " +
      money((r ? C.tender(r, method) : 0) - Math.round(fee * 100));
  }
  const source = f.querySelector('[name="sourceSale"]');
  if (source && source.value) {
    const sale = state.sales.find((r) => r.id === source.value);
    if (!sale) return;
    for (const [k, v] of Object.entries({
      description: sale.fuel + " supply - source " + sale.id,
      quantity: sale.litres,
      rate: (sale.rate / 100).toFixed(2),
    })) {
      const el = f.querySelector(`[name="${k}"]`);
      el.value = v;
      el.readOnly = true;
    }
    const customer = state.customers.find((c) => c.id === sale.customer);
    if (customer) f.querySelector('[name="recipient"]').value = customer.name;
  } else if (source) {
    for (const k of ["description", "quantity", "rate"])
      f.querySelector(`[name="${k}"]`).readOnly = false;
  }
}
