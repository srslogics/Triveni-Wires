(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ForecourtOperations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const actions = [
    "nozzleTest",
    "testReturn",
    "settlement",
    "supplierBill",
    "supplierPay",
    "handover",
  ];
  const sum = (a, f) => a.reduce((v, r) => v + f(r), 0);
  const tender = (r, m) =>
    r.method === "Split" ? r.tenders?.[m] || 0 : r.method === m ? r.amount : 0;
  const returned = (s, id) =>
    sum(
      (s.operations || []).filter(
        (r) => r.kind === "testReturn" && r.test === id,
      ),
      (r) => r.litres,
    );
  const testOut = (s, tank) =>
    sum(
      (s.operations || []).filter(
        (r) => r.kind === "nozzleTest" && r.tank === tank,
      ),
      (r) => r.litres - returned(s, r.id),
    );
  const paid = (s, id) =>
    sum(
      (s.operations || []).filter(
        (r) => r.kind === "supplierPay" && r.bill === id,
      ),
      (r) => r.amount,
    );
  function apply(s, ctx, action, input, tools) {
    const { id, time, txt, val, needOpen } = tools,
      o = input.outlet;
    const allowed = {
      nozzleTest: ["Owner", "Manager"],
      testReturn: ["Owner", "Manager"],
      settlement: ["Owner", "Accountant"],
      supplierBill: ["Owner", "Accountant"],
      supplierPay: ["Owner", "Accountant"],
      handover: ["Owner", "Manager"],
    };
    if (!allowed[action]?.includes(ctx.role))
      throw Error("This action is unavailable for this role.");
    if (!s.operations) s.operations = [];
    const records = s.operations;
    let r = { id: id("OP"), kind: action, outlet: o, time };
    if (action === "nozzleTest") {
      const sh = needOpen(),
        n = s.nozzles.find((n) => n.id === input.nozzle && n.outlet === o);
      if (!n) throw Error("Choose a nozzle in this outlet.");
      const litres = val(input.litres, "test litres", 50),
        opening = tools.meter(s, n.id);
      if (litres > tools.stock(s, n.tank))
        throw Error("Test exceeds available fuel.");
      Object.assign(r, {
        shift: sh.id,
        nozzle: n.id,
        tank: n.tank,
        litres,
        opening,
        closing: Math.round((opening + litres) * 1000) / 1000,
        note: txt(input.note, "a test reason"),
      });
      s.tanks.find((t) => t.id === n.tank).stockRevision++;
    } else if (action === "testReturn") {
      const sh = needOpen(),
        test = records.find(
          (r) =>
            r.id === input.test &&
            r.kind === "nozzleTest" &&
            r.outlet === o &&
            r.shift === sh.id,
        );
      if (!test) throw Error("Choose a test from the current open shift.");
      const litres = val(input.litres, "returned litres", 50);
      if (
        litres >
        Math.round((test.litres - returned(s, test.id)) * 1000) / 1000
      )
        throw Error("Return exceeds unreturned test fuel.");
      if (
        tools.stock(s, test.tank) + litres >
        s.tanks.find((t) => t.id === test.tank).capacity
      )
        throw Error("Returning this fuel would exceed tank capacity.");
      Object.assign(r, {
        shift: sh.id,
        test: test.id,
        tank: test.tank,
        litres,
      });
      s.tanks.find((t) => t.id === test.tank).stockRevision++;
    } else if (action === "settlement") {
      const sale = s.sales.find((r) => r.id === input.sale && r.outlet === o);
      if (
        !sale ||
        !["UPI", "Card"].includes(input.method) ||
        tender(sale, input.method) <= 0
      )
        throw Error("Choose an eligible digital sale and tender.");
      if (
        records.some(
          (r) =>
            r.kind === "settlement" &&
            r.sale === sale.id &&
            r.method === input.method,
        )
      )
        throw Error("This sale tender has already been reconciled.");
      const reference = txt(input.reference, "the bank reference");
      if (
        records.some(
          (r) =>
            r.kind === "settlement" &&
            r.reference.toLowerCase() === reference.toLowerCase(),
        )
      )
        throw Error("Bank reference already used.");
      const fee = Math.round(val(input.fee, "fees", 1e9, 2, true) * 100),
        received = Math.round(
          val(input.received, "bank amount", 1e9, 2, true) * 100,
        ),
        gross = tender(sale, input.method);
      if (fee > gross) throw Error("Fees exceed gross digital sales.");
      Object.assign(r, {
        sale: sale.id,
        method: input.method,
        reference,
        fee,
        received,
        gross,
        difference: received - (gross - fee),
      });
    } else if (action === "supplierBill") {
      const receipt = s.receipts.find(
        (r) => r.id === input.receipt && r.outlet === o,
      );
      if (!receipt) throw Error("Choose a fuel receipt in this outlet.");
      const reference = txt(input.reference, "the supplier bill number");
      if (
        records.some(
          (r) =>
            r.kind === "supplierBill" &&
            (r.receipt === receipt.id ||
              r.reference.toLowerCase() === reference.toLowerCase()),
        )
      )
        throw Error("This receipt or supplier bill is already booked.");
      Object.assign(r, {
        receipt: receipt.id,
        supplier: receipt.supplier,
        reference,
        amount: Math.round(val(input.amount, "bill total", 1e9, 2) * 100),
      });
    } else if (action === "supplierPay") {
      const bill = records.find(
        (r) =>
          r.id === input.bill && r.kind === "supplierBill" && r.outlet === o,
      );
      if (!bill) throw Error("Choose a supplier bill in this outlet.");
      const amount = Math.round(
        val(input.amount, "payment amount", 1e9, 2) * 100,
      );
      if (amount > bill.amount - paid(s, bill.id))
        throw Error("Payment exceeds outstanding supplier balance.");
      const reference = txt(input.reference, "the bank payment reference");
      if (
        records.some(
          (r) =>
            r.kind === "supplierPay" &&
            r.reference.toLowerCase() === reference.toLowerCase(),
        )
      )
        throw Error("Payment reference already recorded.");
      Object.assign(r, { bill: bill.id, amount, reference, method: "Bank" });
    } else if (action === "handover") {
      const sh = needOpen();
      if (
        !s.sales.some((r) => r.shift === sh.id) &&
        input.outgoing === input.incoming
      )
        throw Error("Choose different outgoing and incoming staff.");
      const outgoing = txt(input.outgoing, "the outgoing operator"),
        incoming = txt(input.incoming, "the incoming operator");
      if (outgoing.toLowerCase() === incoming.toLowerCase())
        throw Error("Outgoing and incoming staff must differ.");
      const counted = Math.round(
        val(input.counted, "cash handed over", 1e9, 2, true) * 100,
      );
      Object.assign(r, {
        shift: sh.id,
        outgoing,
        incoming,
        counted,
        expected: tools.expectedCash(s, sh.id),
        note: txt(input.note, "a handover note"),
      });
    }
    records.push(r);
    return {
      message: {
        nozzleTest: "Test fuel withdrawn; meter advanced without a sale",
        testReturn: "Test fuel returned to its tank",
        settlement: "Digital sale reconciled to a manually entered bank amount",
        supplierBill: "Supplier payable recorded; stock unchanged",
        supplierPay: "Bank payment recorded; supplier balance reduced",
        handover: "Staff handover recorded; shift remains open",
      }[action],
    };
  }
  function valid(s) {
    if (s.operations === undefined) return true;
    if (!Array.isArray(s.operations) || s.operations.length > 20000)
      return false;
    const ids = new Set(),
      once = new Set(),
      int = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e11,
      vol = (n) =>
        typeof n === "number" &&
        n > 0 &&
        n <= 50 &&
        Math.abs(n * 1000 - Math.round(n * 1000)) < 0.0001,
      text = (t) =>
        typeof t === "string" && t.trim().length > 0 && t.length <= 160;
    for (const r of s.operations) {
      if (
        !r ||
        !actions.includes(r.kind) ||
        !text(r.id) ||
        ids.has(r.id) ||
        !/^OP-\d+$/.test(r.id) ||
        Number(r.id.split("-").at(-1)) > s.sequence ||
        !s.outlets.some((o) => o.id === r.outlet) ||
        !Number.isFinite(Date.parse(r.time))
      )
        return false;
      ids.add(r.id);
      if (r.kind === "nozzleTest") {
        if (
          !s.nozzles.some(
            (n) =>
              n.id === r.nozzle && n.tank === r.tank && n.outlet === r.outlet,
          ) ||
          !s.shifts.some((sh) => sh.id === r.shift && sh.outlet === r.outlet) ||
          !vol(r.litres) ||
          !text(r.note) ||
          Math.round((r.closing - r.opening) * 1000) !==
            Math.round(r.litres * 1000) ||
          returned(s, r.id) > r.litres + 0.000001
        )
          return false;
      } else if (r.kind === "testReturn") {
        const test = s.operations.find(
          (t) =>
            t.id === r.test &&
            t.kind === "nozzleTest" &&
            t.outlet === r.outlet &&
            t.shift === r.shift &&
            t.tank === r.tank,
        );
        if (!test || !vol(r.litres)) return false;
      } else if (r.kind === "settlement") {
        const sale = s.sales.find(
          (x) => x.id === r.sale && x.outlet === r.outlet,
        );
        const key = r.sale + ":" + r.method,
          ref = "bank:" + r.reference?.toLowerCase();
        if (
          !sale ||
          !["UPI", "Card"].includes(r.method) ||
          tender(sale, r.method) !== r.gross ||
          r.gross <= 0 ||
          !int(r.fee) ||
          r.fee > r.gross ||
          !int(r.received) ||
          r.difference !== r.received - (r.gross - r.fee) ||
          !text(r.reference) ||
          once.has(key) ||
          once.has(ref)
        )
          return false;
        once.add(key);
        once.add(ref);
      } else if (r.kind === "supplierBill") {
        if (
          !s.receipts.some(
            (x) =>
              x.id === r.receipt &&
              x.outlet === r.outlet &&
              x.supplier === r.supplier,
          ) ||
          !text(r.reference) ||
          !int(r.amount) ||
          r.amount <= 0 ||
          paid(s, r.id) > r.amount ||
          once.has("bill:" + r.reference.toLowerCase()) ||
          once.has("receipt:" + r.receipt)
        )
          return false;
        once.add("bill:" + r.reference.toLowerCase());
        once.add("receipt:" + r.receipt);
      } else if (r.kind === "supplierPay") {
        if (
          !s.operations.some(
            (b) =>
              b.id === r.bill &&
              b.kind === "supplierBill" &&
              b.outlet === r.outlet,
          ) ||
          !int(r.amount) ||
          r.amount <= 0 ||
          r.method !== "Bank" ||
          !text(r.reference) ||
          once.has("pay:" + r.reference.toLowerCase())
        )
          return false;
        once.add("pay:" + r.reference.toLowerCase());
      } else if (r.kind === "handover") {
        if (
          !s.shifts.some((sh) => sh.id === r.shift && sh.outlet === r.outlet) ||
          !text(r.incoming) ||
          !text(r.outgoing) ||
          r.incoming.toLowerCase() === r.outgoing.toLowerCase() ||
          !int(r.counted) ||
          !int(r.expected) ||
          !text(r.note)
        )
          return false;
      }
    }
    return true;
  }
  return { actions, apply, valid, tender, testOut, returned, paid };
});
