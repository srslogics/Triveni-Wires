(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Forecourt = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DAY = "2026-11-02",
    KEY = "forecourt-demo-v1";
  const ROLES = {
    Owner: [
      "overview",
      "outlets",
      "sales",
      "tanks",
      "receipts",
      "shifts",
      "credit",
      "invoices",
      "expenses",
      "maintenance",
      "reports",
      "activity",
    ],
    Manager: [
      "overview",
      "sales",
      "tanks",
      "receipts",
      "shifts",
      "credit",
      "invoices",
      "expenses",
      "maintenance",
      "activity",
    ],
    Accountant: [
      "overview",
      "sales",
      "shifts",
      "credit",
      "invoices",
      "expenses",
      "reports",
      "activity",
    ],
  };
  const round = (n) => Math.round(n * 1000) / 1000;
  const sum = (a, f) => a.reduce((n, v) => n + f(v), 0);
  const error = (m) => {
    throw new Error(m);
  };
  function seed() {
    const outlets = [
      {
        id: "central",
        name: "Central Avenue",
        area: "City retail · Outlet 01",
        manager: "Aarav Mehta",
        target: 7000,
      },
      {
        id: "highway",
        name: "Highway Junction",
        area: "Highway & fleet · Outlet 02",
        manager: "Neha Shah",
        target: 10000,
      },
      {
        id: "airport",
        name: "Airport Road",
        area: "Commuter retail · Outlet 03",
        manager: "Rohan Patil",
        target: 6000,
      },
    ];
    const s = {
      version: 1,
      revision: 0,
      sequence: 100,
      day: DAY,
      outlets,
      tanks: [],
      nozzles: [],
      sales: [],
      invoices: [],
      receipts: [],
      shifts: [],
      customers: [],
      collections: [],
      expenses: [],
      tasks: [],
      audit: [],
      history: [
        { label: "27 Oct", litres: 16120 },
        { label: "28 Oct", litres: 17800 },
        { label: "29 Oct", litres: 16950 },
        { label: "30 Oct", litres: 19240 },
        { label: "31 Oct", litres: 20110 },
        { label: "01 Nov", litres: 18560 },
      ],
    };
    outlets.forEach((o, i) => {
      s.shifts.push({
        id: o.id + "-shift-1",
        outlet: o.id,
        name: "Shift A · 06:00–14:00",
        status: "open",
        float: 100000,
        counted: null,
        submittedBy: null,
      });
      s.customers.push({
        id: o.id + "-fleet",
        outlet: o.id,
        name: ["Meridian Logistics", "Northline Transport", "Bluebird Travels"][
          i
        ],
        limit: 50000000,
        opening: [8200000, 12600000, 4300000][i],
        due: "2026-10-30",
      });
      ["Petrol", "Diesel"].forEach((fuel, j) => {
        const tank = {
          id: o.id + "-" + fuel.toLowerCase(),
          outlet: o.id,
          name: "Tank " + (j + 1),
          fuel,
          capacity: j ? 40000 : 20000,
          opening: j ? (i === 1 ? 9800 : 17000) : 12000,
          rate: j ? 9175 : 10420,
          cost: j ? 8890 : 10060,
          reorder: j ? 6000 : 4000,
          physical: null,
          readingRevision: 0,
          stockRevision: 0,
        };
        s.tanks.push(tank);
        const nozzle = {
          id: o.id + "-N" + (j + 1),
          outlet: o.id,
          label: "N0" + (j + 1),
          tank: tank.id,
          opening: 240000 + i * 80000 + j * 18000,
        };
        s.nozzles.push(nozzle);
        const quantities = j ? [2400, 4600, 1800] : [2100, 1800, 1700];
        let meter = nozzle.opening;
        ["Cash", "UPI", "Card", "Credit"].forEach((t, k) => {
          const litres = round(quantities[i] * [0.4, 0.3, 0.2, 0.1][k]);
          s.sales.push({
            id: "SL-" + s.sequence++,
            outlet: o.id,
            shift: o.id + "-shift-1",
            nozzle: nozzle.id,
            tank: tank.id,
            fuel,
            litres,
            rate: tank.rate,
            cost: tank.cost,
            amount: Math.round(litres * tank.rate),
            method: t,
            customer: t === "Credit" ? o.id + "-fleet" : null,
            opening: meter,
            closing: round(meter + litres),
            time:
              DAY + "T" + ["07:15", "09:20", "11:40", "13:10"][k] + ":00+05:30",
          });
          meter = round(meter + litres);
        });
      });
      s.expenses.push({
        id: "EX-" + s.sequence++,
        outlet: o.id,
        shift: o.id + "-shift-1",
        category: "Station supplies",
        note: "Sample shift consumables",
        amount: [180000, 245000, 120000][i],
        method: "Cash",
      });
      s.tasks.push({
        id: "MT-" + s.sequence++,
        outlet: o.id,
        title: [
          "Review nozzle N02 calibration record",
          "Inspect dispenser hose condition",
          "Review extinguisher service record",
        ][i],
        due: ["2026-11-02", "2026-11-03", "2026-11-07"][i],
        status: "Open",
      });
    });
    s.receipts.push({
      id: "GR-100",
      outlet: "central",
      tank: "central-diesel",
      docket: "DEMO-7821",
      supplier: "Illustrative depot",
      invoiced: 5000,
      received: 4988,
      note: "12 L difference flagged for supplier review",
      time: DAY + "T08:00:00+05:30",
    });
    s.tanks.forEach((t) => {
      t.physical = round(
        stock(s, t.id) +
          { central: -18, highway: -42, airport: 0 }[t.outlet] *
            (t.fuel === "Diesel" ? 1 : 0),
      );
    });
    s.audit.push({
      id: "EV-100",
      time: DAY + "T13:30:00+05:30",
      outlet: "all",
      role: "System",
      text: "Illustrative meeting dataset loaded. No live pump connections.",
    });
    return s;
  }
  function stock(s, id) {
    const t = s.tanks.find((t) => t.id === id);
    return round(
      t.opening +
        sum(
          s.receipts.filter((r) => r.tank === id),
          (r) => r.received,
        ) -
        sum(
          s.sales.filter((r) => r.tank === id),
          (r) => r.litres,
        ),
    );
  }
  function balance(s, id) {
    const c = s.customers.find((c) => c.id === id);
    return (
      c.opening +
      sum(
        s.sales.filter((r) => r.customer === id),
        (r) => r.amount,
      ) -
      sum(
        s.collections.filter((r) => r.customer === id),
        (r) => r.amount,
      )
    );
  }
  function meter(s, id) {
    const n = s.nozzles.find((n) => n.id === id);
    return s.sales.filter((x) => x.nozzle === id).at(-1)?.closing ?? n.opening;
  }
  function expectedCash(s, id) {
    const sh = s.shifts.find((r) => r.id === id);
    return (
      sh.float +
      sum(
        s.sales.filter((r) => r.shift === id && r.method === "Cash"),
        (r) => r.amount,
      ) +
      sum(
        s.collections.filter((r) => r.shift === id && r.method === "Cash"),
        (r) => r.amount,
      ) -
      sum(
        s.expenses.filter((r) => r.shift === id && r.method === "Cash"),
        (r) => r.amount,
      )
    );
  }
  function scope(s, ctx) {
    return ctx.role === "Owner" ? ctx.outlet || "all" : ctx.outlet;
  }
  function rows(s, key, ctx) {
    const outlet = scope(s, ctx);
    return (s[key] || []).filter(
      (x) =>
        outlet === "all" ||
        x.outlet === outlet ||
        (key === "audit" && x.outlet === "all"),
    );
  }
  function metrics(s, ctx) {
    const sales = rows(s, "sales", ctx),
      tanks = rows(s, "tanks", ctx),
      shifts = rows(s, "shifts", ctx);
    return {
      sales: sum(sales, (r) => r.amount),
      litres: round(sum(sales, (r) => r.litres)),
      margin: sum(sales, (r) => r.amount - Math.round(r.litres * r.cost)),
      expenses: sum(rows(s, "expenses", ctx), (r) => r.amount),
      stock: round(sum(tanks, (t) => stock(s, t.id))),
      credit: sum(rows(s, "customers", ctx), (c) => balance(s, c.id)),
      cash: sum(shifts, (sh) => expectedCash(s, sh.id)),
      variance: round(
        sum(
          tanks.filter((t) => t.readingRevision === t.stockRevision),
          (t) => t.physical - stock(s, t.id),
        ),
      ),
      low: tanks.filter((t) => stock(s, t.id) < t.reorder).length,
    };
  }
  function authorize(ctx, action, outlet) {
    if (!ctx || !Object.hasOwn(ROLES, ctx.role))
      error("Choose a valid demo role.");
    if (ctx.role !== "Owner" && outlet !== ctx.outlet)
      error("This outlet is outside the selected workspace.");
    const permission = {
      invoice: ["Owner", "Manager", "Accountant"],
      sale: ["Owner", "Manager"],
      receipt: ["Owner", "Manager"],
      dip: ["Owner", "Manager"],
      close: ["Owner", "Manager"],
      approve: ["Owner", "Accountant"],
      reopen: ["Owner", "Accountant"],
      start: ["Owner", "Manager"],
      collect: ["Owner", "Manager", "Accountant"],
      expense: ["Owner", "Manager", "Accountant"],
      task: ["Owner", "Manager"],
      complete: ["Owner", "Manager"],
    };
    if (!permission[action]?.includes(ctx.role))
      error("This action is unavailable for the selected role.");
  }
  function apply(state, ctx, action, input) {
    if (!valid(state))
      error(
        "The saved workspace failed its integrity checks. Export it for review before resetting.",
      );
    if (!input || typeof input !== "object")
      error("Enter transaction details.");
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== state.revision
    )
      error(
        "This form is out of date. Close it and review the latest figures.",
      );
    const s = JSON.parse(JSON.stringify(state)),
      o = s.outlets.find((o) => o.id === input.outlet);
    if (!o) error("Choose an outlet.");
    authorize(ctx, action, o.id);
    const open = s.shifts.find(
      (sh) => sh.outlet === o.id && sh.status === "open",
    );
    const needOpen = () => {
      if (!open)
        error("Start an open shift before recording this transaction.");
      return open;
    };
    const val = (v, label, max = 1e9, places = 3, zero = false) =>
      decimal(v, label, places, max, zero);
    const txt = (v, label) => {
      const t = typeof v === "string" ? v.trim() : "";
      if (!t || t.length > 160 || /[\u0000-\u001f]/.test(t))
        error("Enter " + label + " (up to 160 characters).");
      return t;
    };
    const tank = () => {
      const t = s.tanks.find((t) => t.id === input.tank && t.outlet === o.id);
      if (!t) error("Choose a tank belonging to this outlet.");
      return t;
    };
    const payment = () => {
      if (!["Cash", "UPI", "Card", "Bank", "Credit"].includes(input.method))
        error("Choose a payment method.");
      return input.method;
    };
    const id = (prefix) => prefix + "-" + ++s.sequence;
    const time = new Date().toISOString();
    let message = "";
    if (action === "sale") {
      const sh = needOpen(),
        n = s.nozzles.find((n) => n.id === input.nozzle && n.outlet === o.id);
      if (!n) error("Choose a nozzle from this outlet.");
      const t = s.tanks.find((t) => t.id === n.tank),
        opening = meter(s, n.id),
        closing = round(val(input.closing, "closing meter")),
        litres = round(closing - opening);
      if (litres <= 0) error("Closing meter must exceed the previous reading.");
      if (litres > stock(s, t.id)) error("Sale exceeds available book stock.");
      const method = payment();
      if (method === "Bank")
        error("Select Cash, UPI, Card or Credit for nozzle sales.");
      const amount = Math.round(litres * t.rate);
      let customer = null;
      if (method === "Credit") {
        customer = input.customer;
        const c = s.customers.find(
          (c) => c.id === customer && c.outlet === o.id,
        );
        if (!c) error("Choose a fleet customer from this outlet.");
        if (balance(s, c.id) + amount > c.limit)
          error("This sale exceeds the customer’s sample credit limit.");
      }
      s.sales.push({
        id: id("SL"),
        outlet: o.id,
        shift: sh.id,
        nozzle: n.id,
        tank: t.id,
        fuel: t.fuel,
        litres,
        rate: t.rate,
        cost: t.cost,
        amount,
        method,
        customer,
        opening,
        closing,
        time,
      });
      t.stockRevision++;
      message = `${litres.toLocaleString("en-IN")} L ${t.fuel.toLowerCase()} sale recorded`;
    } else if (action === "receipt") {
      const t = tank(),
        received = round(val(input.received, "received litres", t.capacity)),
        invoiced = round(val(input.invoiced, "invoiced litres", t.capacity)),
        docket = txt(input.docket, "a delivery reference");
      if (received <= 0 || invoiced <= 0) error("Enter at least 0.001 litres.");
      if (
        s.receipts.some((r) => r.docket.toLowerCase() === docket.toLowerCase())
      )
        error("This delivery reference has already been posted.");
      if (stock(s, t.id) + received > t.capacity)
        error("Receipt exceeds the tank’s configured capacity.");
      s.receipts.push({
        id: id("GR"),
        outlet: o.id,
        tank: t.id,
        docket,
        supplier: txt(input.supplier, "a supplier"),
        invoiced,
        received,
        note: String(input.note || "").slice(0, 160),
        time,
      });
      t.stockRevision++;
      message = "Fuel receipt posted; stock updated";
    } else if (action === "dip") {
      const t = tank();
      const value = val(input.physical, "measured litres", t.capacity, 3, true);
      t.physical = round(value);
      t.readingRevision = t.stockRevision;
      t.readingTime = time;
      message = "Measured stock recorded; variance recalculated";
    } else if (action === "close") {
      const sh = needOpen(),
        counted = val(input.counted, "cash count", 1e9, 2, true);
      sh.counted = Math.round(counted * 100);
      sh.expected = expectedCash(s, sh.id);
      if (sh.counted !== sh.expected && !String(input.note || "").trim())
        error("Explain the cash difference before submitting.");
      sh.note = String(input.note || "").slice(0, 160);
      sh.submittedBy = ctx.role;
      sh.status = "submitted";
      message = "Shift submitted for independent review";
    } else if (action === "approve" || action === "reopen") {
      const sh = s.shifts.find(
        (sh) =>
          sh.id === input.shift &&
          sh.outlet === o.id &&
          sh.status === "submitted",
      );
      if (!sh) error("Select a shift awaiting review.");
      if (action === "approve" && sh.submittedBy === ctx.role)
        error("Switch to a different reviewing role to approve this shift.");
      sh.status = action === "approve" ? "approved" : "open";
      sh.reviewedBy = ctx.role;
      message =
        action === "approve"
          ? "Shift approved; closing record locked"
          : "Shift returned for correction";
    } else if (action === "start") {
      if (s.shifts.some((sh) => sh.outlet === o.id && sh.status !== "approved"))
        error("Approve the previous shift before opening another.");
      const f = val(input.float, "opening cash float", 1e9, 2, true);
      s.shifts.push({
        id: id("SH"),
        outlet: o.id,
        name: txt(input.name, "a shift name"),
        status: "open",
        float: Math.round(f * 100),
        counted: null,
        submittedBy: null,
      });
      message = "New shift opened with continuous meter readings";
    } else if (action === "collect") {
      const sh = needOpen(),
        c = s.customers.find(
          (c) => c.id === input.customer && c.outlet === o.id,
        );
      if (!c) error("Choose a fleet customer from this outlet.");
      const amount = Math.round(
        val(input.amount, "collection amount", 1e9, 2) * 100,
      );
      if (amount <= 0) error("Enter at least ₹0.01.");
      if (amount > balance(s, c.id))
        error("Collection exceeds the outstanding balance.");
      const method = payment();
      if (method === "Credit") error("Select a received payment method.");
      s.collections.push({
        id: id("RC"),
        outlet: o.id,
        shift: sh.id,
        customer: c.id,
        amount,
        method,
        time,
      });
      message = "Payment recorded; receivable updated";
    } else if (action === "expense") {
      const sh = needOpen(),
        amount = Math.round(val(input.amount, "expense amount", 1e9, 2) * 100),
        method = payment();
      if (amount <= 0) error("Enter at least ₹0.01.");
      if (method === "Credit") error("Choose how this expense was paid.");
      if (method === "Cash" && amount > expectedCash(s, sh.id))
        error("Expense exceeds expected cash available.");
      s.expenses.push({
        id: id("EX"),
        outlet: o.id,
        shift: sh.id,
        amount,
        method,
        category: txt(input.category, "an expense category"),
        note: txt(input.note, "an expense description"),
        time,
      });
      message = "Expense recorded";
    } else if (action === "task") {
      const due = String(input.due || "");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(due) ||
        Number.isNaN(Date.parse(due)) ||
        new Date(due).toISOString().slice(0, 10) !== due
      )
        error("Enter a valid due date.");
      s.tasks.push({
        id: id("MT"),
        outlet: o.id,
        title: txt(input.title, "a task description"),
        due,
        status: "Open",
      });
      message = "Maintenance task added";
    } else if (action === "invoice") {
      const reference = txt(input.reference, "an invoice reference");
      if (
        (s.invoices || []).some(
          (r) => r.reference.toLowerCase() === reference.toLowerCase(),
        )
      )
        error("This invoice reference already exists.");
      const date = String(input.date || "");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        error("Enter a valid invoice date.");
      const phone = String(input.phone || "").replace(/[\s()+-]/g, "");
      if (phone && !/^[1-9]\d{7,14}$/.test(phone))
        error(
          "Enter the country code and number, for example 919876543210, or leave it blank.",
        );
      if (
        !["Customer", "Dealer", "Vendor", "Other"].includes(input.recipientType)
      )
        error("Choose a recipient type.");
      const quantity = val(input.quantity, "quantity", 1e7, 3),
        rate = Math.round(val(input.rate, "unit price", 1e7, 2) * 100),
        amount = Math.round(quantity * rate);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e11)
        error("Invoice total is outside the supported range.");
      const record = {
        id: id("IN"),
        outlet: o.id,
        reference,
        date,
        seller: txt(input.seller, "the seller name"),
        recipient: txt(input.recipient, "the recipient name"),
        recipientType: input.recipientType,
        phone,
        address: txt(input.address, "the recipient address"),
        description: txt(input.description, "an item description"),
        quantity,
        unit: txt(input.unit, "a unit"),
        rate,
        amount,
        note: String(input.note || "").slice(0, 160),
        status: "Draft",
        time,
      };
      if (!s.invoices) s.invoices = [];
      s.invoices.push(record);
      message = "Draft invoice created; financial ledgers unchanged";
    } else if (action === "complete") {
      const task = s.tasks.find(
        (t) => t.id === input.task && t.outlet === o.id,
      );
      if (!task || task.status !== "Open")
        error("This task is already complete or unavailable.");
      task.status = "Done";
      message = "Task marked complete";
    }
    s.revision++;
    s.audit.unshift({
      id: id("EV"),
      time,
      outlet: o.id,
      role: ctx.role,
      text: message,
    });
    if (!valid(s))
      error(
        "The transaction could not pass the ledger checks. No changes were saved.",
      );
    return { state: s, message };
  }
  // Decimal input is bounded before conversion. Reject booleans, scientific notation,
  // whitespace-only values and precision that would silently change entered amounts.
  function decimal(value, label, places, max, zero = false) {
    const raw =
      typeof value === "number" || typeof value === "string"
        ? String(value).trim()
        : "";
    if (!new RegExp("^\\d+(?:\\.\\d{1," + places + "})?$").test(raw))
      error(
        "Enter a valid " + label + " with up to " + places + " decimal places.",
      );
    const n = Number(raw);
    if (!Number.isFinite(n) || n > max || (zero ? n < 0 : n <= 0))
      error("Enter a valid " + label + ".");
    return n;
  }
  function valid(s) {
    try {
      const int = (v, max = 1e11) =>
        Number.isSafeInteger(v) && v >= 0 && v <= max;
      const volume = (v) =>
        typeof v === "number" &&
        Number.isFinite(v) &&
        v >= 0 &&
        v <= 1e9 &&
        Math.abs(v * 1000 - Math.round(v * 1000)) < 0.0001;
      const text = (v, limit = 160) =>
        typeof v === "string" && v.trim().length > 0 && v.length <= limit;
      const iso = (v) =>
        typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}T/.test(v) &&
        Number.isFinite(Date.parse(v));
      if (
        !s ||
        s.version !== 1 ||
        s.day !== DAY ||
        !int(s.revision) ||
        !int(s.sequence)
      )
        return false;
      const baseline = seed();
      // These master records have no editing workflow in this version.
      for (const key of ["outlets", "nozzles", "history"])
        if (JSON.stringify(s[key]) !== JSON.stringify(baseline[key]))
          return false;
      for (const key of ["tanks", "customers"])
        if (
          JSON.stringify(s[key].map((x) => x.id)) !==
          JSON.stringify(baseline[key].map((x) => x.id))
        )
          return false;
      const keys = [
        "tanks",
        "customers",
        "sales",
        "receipts",
        "shifts",
        "collections",
        "expenses",
        "tasks",
        "audit",
      ];
      for (const key of keys) {
        if (!Array.isArray(s[key]) || s[key].length > 20000) return false;
        const ids = new Set();
        for (const x of s[key]) {
          if (!x || typeof x !== "object" || !text(x.id, 80) || ids.has(x.id))
            return false;
          ids.add(x.id);
          if (key !== "audit" && !s.outlets.some((o) => o.id === x.outlet))
            return false;
          const serial = Number(x.id.split("-").at(-1));
          if (Number.isInteger(serial) && serial > s.sequence) return false;
        }
      }
      const sameShift = (x) =>
        s.shifts.some((sh) => sh.id === x.shift && sh.outlet === x.outlet);
      const sameCustomer = (x) =>
        s.customers.some((c) => c.id === x.customer && c.outlet === x.outlet);
      const sameTank = (x) =>
        s.tanks.some((t) => t.id === x.tank && t.outlet === x.outlet);
      const methods = ["Cash", "UPI", "Card", "Bank"];
      for (const t of s.tanks) {
        const original = baseline.tanks.find((x) => x.id === t.id);
        for (const field of [
          "outlet",
          "fuel",
          "name",
          "capacity",
          "opening",
          "reorder",
        ])
          if (t[field] !== original[field]) return false;
        if (
          !int(t.rate) ||
          t.rate === 0 ||
          !int(t.cost) ||
          !volume(t.physical) ||
          t.physical > t.capacity ||
          !int(t.stockRevision) ||
          !int(t.readingRevision) ||
          t.readingRevision > t.stockRevision
        )
          return false;
        if (t.readingTime !== undefined && !iso(t.readingTime)) return false;
      }
      if (
        s.customers.some(
          (c) =>
            !text(c.name) ||
            !int(c.opening) ||
            !int(c.limit) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(c.due),
        )
      )
        return false;
      const meters = new Map(s.nozzles.map((n) => [n.id, n.opening]));
      for (const r of s.sales) {
        if (
          !sameShift(r) ||
          !sameTank(r) ||
          !s.nozzles.some(
            (n) =>
              n.id === r.nozzle && n.outlet === r.outlet && n.tank === r.tank,
          ) ||
          !iso(r.time)
        )
          return false;
        if (
          !volume(r.opening) ||
          !volume(r.closing) ||
          !volume(r.litres) ||
          r.litres <= 0 ||
          r.opening !== meters.get(r.nozzle) ||
          round(r.closing - r.opening) !== r.litres
        )
          return false;
        if (
          !int(r.rate) ||
          !int(r.cost) ||
          !int(r.amount) ||
          r.amount !== Math.round(r.litres * r.rate) ||
          r.amount <= 0 ||
          r.fuel !== s.tanks.find((t) => t.id === r.tank).fuel
        )
          return false;
        if (
          !["Cash", "UPI", "Card", "Credit"].includes(r.method) ||
          (r.method === "Credit" && !sameCustomer(r)) ||
          (r.method !== "Credit" && r.customer !== null)
        )
          return false;
        meters.set(r.nozzle, r.closing);
      }
      const dockets = new Set();
      for (const r of s.receipts) {
        if (
          !sameTank(r) ||
          !text(r.docket) ||
          !text(r.supplier) ||
          !volume(r.received) ||
          r.received <= 0 ||
          !volume(r.invoiced) ||
          r.invoiced <= 0 ||
          !iso(r.time)
        )
          return false;
        const docket = r.docket.trim().toLowerCase();
        if (dockets.has(docket)) return false;
        dockets.add(docket);
      }
      for (const r of s.collections)
        if (
          !sameShift(r) ||
          !sameCustomer(r) ||
          !int(r.amount) ||
          r.amount <= 0 ||
          !methods.includes(r.method) ||
          !iso(r.time)
        )
          return false;
      for (const r of s.expenses)
        if (
          !sameShift(r) ||
          !int(r.amount) ||
          r.amount <= 0 ||
          !methods.includes(r.method) ||
          !text(r.category) ||
          !text(r.note)
        )
          return false;
      for (const sh of s.shifts) {
        if (
          !text(sh.name) ||
          !int(sh.float) ||
          !["open", "submitted", "approved"].includes(sh.status)
        )
          return false;
        if (sh.status !== "open") {
          if (
            !int(sh.counted) ||
            !int(sh.expected) ||
            sh.expected !== expectedCash(s, sh.id) ||
            !Object.hasOwn(ROLES, sh.submittedBy)
          )
            return false;
          if (sh.counted !== sh.expected && !text(sh.note)) return false;
          if (
            sh.status === "approved" &&
            (!["Owner", "Accountant"].includes(sh.reviewedBy) ||
              sh.reviewedBy === sh.submittedBy)
          )
            return false;
        }
        if (expectedCash(s, sh.id) < 0) return false;
      }
      for (const o of s.outlets) {
        const shifts = s.shifts.filter((sh) => sh.outlet === o.id);
        if (
          !shifts.length ||
          shifts.filter((sh) => sh.status !== "approved").length > 1
        )
          return false;
      }
      for (const t of s.tasks)
        if (
          !text(t.title) ||
          !["Open", "Done"].includes(t.status) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(t.due) ||
          !Number.isFinite(Date.parse(t.due)) ||
          new Date(t.due).toISOString().slice(0, 10) !== t.due
        )
          return false;
      if (s.invoices !== undefined) {
        if (!Array.isArray(s.invoices) || s.invoices.length > 20000)
          return false;
        const ids = new Set(),
          references = new Set();
        for (const r of s.invoices) {
          if (
            !r ||
            !text(r.id, 80) ||
            ids.has(r.id) ||
            !text(r.reference) ||
            references.has(r.reference.toLowerCase())
          )
            return false;
          ids.add(r.id);
          references.add(r.reference.toLowerCase());
          if (
            !s.outlets.some((o) => o.id === r.outlet) ||
            !text(r.seller) ||
            !text(r.recipient) ||
            !text(r.address) ||
            !text(r.description) ||
            !text(r.unit) ||
            !["Customer", "Dealer", "Vendor", "Other"].includes(
              r.recipientType,
            ) ||
            r.status !== "Draft" ||
            typeof r.phone !== "string" ||
            (r.phone && !/^[1-9]\d{7,14}$/.test(r.phone))
          )
            return false;
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
            !Number.isFinite(Date.parse(r.date)) ||
            new Date(r.date).toISOString().slice(0, 10) !== r.date ||
            !iso(r.time)
          )
            return false;
          if (
            !volume(r.quantity) ||
            r.quantity <= 0 ||
            !int(r.rate) ||
            r.rate <= 0 ||
            !int(r.amount) ||
            r.amount !== Math.round(r.quantity * r.rate) ||
            r.amount <= 0 ||
            Number(r.id.split("-").at(-1)) > s.sequence
          )
            return false;
        }
      }
      for (const a of s.audit)
        if (
          !iso(a.time) ||
          !text(a.text, 500) ||
          !["Owner", "Manager", "Accountant", "System"].includes(a.role) ||
          (a.outlet !== "all" && !s.outlets.some((o) => o.id === a.outlet))
        )
          return false;
      return (
        s.tanks.every(
          (t) => stock(s, t.id) >= 0 && stock(s, t.id) <= t.capacity,
        ) && s.customers.every((c) => balance(s, c.id) >= 0)
      );
    } catch {
      return false;
    }
  }

  return {
    DAY,
    KEY,
    ROLES,
    seed,
    stock,
    balance,
    meter,
    expectedCash,
    scope,
    rows,
    metrics,
    apply,
    valid,
    round,
    sum,
  };
});
