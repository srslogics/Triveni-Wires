# Forecourt — multi-outlet petrol pump prototype

A new, independent client presentation app. It does not modify or share state with Triveni Wires.

## What is implemented

- Owner overview with consolidated or outlet-specific sales, stock, fleet dues, indicative fuel margin and exceptions.
- Three fictional outlets; six tanks and six nozzles; 24 seeded sales with four tender types.
- Eleven owner screens: Overview, Outlet performance, Sales & nozzles, Tank inventory, Fuel receipts, Shift reconciliation, Fleet & credit, Expenses, Maintenance, Reports, Activity log.
- Station manager and Accountant demo workspaces with relevant navigation and outlet-specific records. The outlet selector simulates switching assigned stations; it is not real authorization.
- Meter-increment sales, tank receipts, measured-stock observations, cash closing, independent-role review, next shift, fleet collections, expenses and maintenance tasks.
- CSV sales export, print summary, presentation guide and reset with confirmation.
- Browser-local persistence, stale-tab check, visible storage failure and recovery of malformed stored data.

## Confirmed brief and assumptions

**User confirmed:** Build a prototype for a new client who owns multiple petrol pumps.

**Inferred, not client-verified:** India/INR; Owner, Station manager and Accountant roles; three sample outlets; petrol and diesel; tank capacities; nozzle mapping; shift workflow; fleet credit limits; landed costs; selling rates; reorder points; service tasks and reporting structure. Forecourt is a placeholder product brand. Every customer, staff member, transaction, outlet and figure is fictional. The sample day is 2 November 2026; it does not roll over automatically.

## Connected calculations

Money is stored as integer paise; stock and meter volumes are rounded to 0.001 L.

- Nozzle sale litres = closing meter minus previous reading. A sale uses the sample product rate captured at posting, reduces book fuel stock, and feeds either a tender total or a fleet receivable.
- Book tank stock = sample opening stock + accepted receipts − nozzle sales.
- Tank variance = measured litres − book litres. A movement makes the prior physical reading stale. Recording a new observation does not adjust stock or diagnose a leak.
- Expected shift cash = opening float + cash fuel sales + cash fleet collections − cash expenses. UPI, card and bank entries do not enter cash-in-drawer calculations.
- Fleet outstanding = opening dues + credit sales − collections. Excess collections and new credit above the sample account limit are rejected.
- Indicative fuel margin = sale amounts − captured sample landed fuel costs. Margin less recorded expenses is not net profit.

Historical chart points for 27 October–1 November are illustrative daily snapshots, scaled to outlet for presentation. The current day's point comes from the transaction register. No live growth claims are shown.

## Presentation sequence

1. Owner / All outlets: ₹13,90,920 sample fuel sales; 14,400 L sold; 70,388 L book stock; ₹3,90,092 fleet outstanding; ₹45,240 indicative fuel margin before ₹5,450 recorded expenses.
2. Open Tank inventory: Highway diesel has 5,200 L against a 6,000 L sample reorder point. The two measured diesel differences are −18 L and −42 L.
3. Record 100 L of petrol sales at Central Avenue: previous nozzle N01 meter is 242100; enter closing 242200 and Cash. Sales rise by ₹10,420; tank stock falls by 100 L; the old physical reading becomes stale.
4. Receive 5,000 L into Highway diesel with a new delivery reference. Record a new measured volume to demonstrate reconciliation.
5. Station manager / Central Avenue: submit a cash closing ₹200 below expected with a reason. Owner / Central Avenue: review and approve it. The same role cannot approve its own submission.
6. Collect ₹10,000 by Bank from an Airport Road fleet customer while its shift remains open. Its receivable falls without changing expected cash.
7. Owner / All outlets: Reports → Download sales CSV or Print summary.

The in-app Presentation guide covers this flow. Reset sample data restores the original scenario after confirmation.

## Implementation boundaries

This is a browser-local presentation prototype, not a production ERP. Demo roles are not login security. Records are not synchronized between users or devices, and the local activity log is not tamper-proof. Do not enter real financial, customer or employee information.

No pump-controller, ATG, OMC, payment-gateway, banking, accounting or statutory filing integration is connected. No automated stock adjustment, temperature/density normalization, calibrated dip-height conversion, nozzle testing return, meter rollover, split tender, refund, bank-settlement reconciliation or supplier-payable ledger is implemented. One meter increment has one tender; production shift reconciliation must support the client's actual tender and test-return rules. Prices are sample values, not current fuel rates. Local regulations, dealer agreements, accounting/tax treatment and measurement practices need specialist and client verification.

A service task marked complete records a demonstration action, not a valid certificate or inspection. The model borrows the generic concept of comparing measured stock against receipts and sales from the [EPA inventory-control overview](https://www.epa.gov/ust/release-detection-underground-storage-tanks-internal-methods); this does not apply US regulatory rules to an Indian client or claim certified leak detection.

## Run and test

No build dependency or production runtime dependency is needed. Run `npm run build`, then `npm start` to serve the generated `dist/` on localhost:8770. Source files are in `public/`. The fonts use Google Fonts with system fallbacks; the rest of the app requires no external service.

For tests, run `npm install` then `npm test`. Tests use linkedom for Node DOM simulation and do not launch a browser. Alternatively set `FORECOURT_DOM_LIB` to an absolute path of an already-installed linkedom package.

Validation covers 14 transaction test groups and 81 role/outlet/module renders, plus form submissions, escaping, exports, print invocation, refresh, blocked/corrupt storage, stale-tab protection and reset. Responsive layouts and focus styles are implemented; visual, mobile, real-browser keyboard and print-layout verification were not performed because the user requested no browser use.

## Host this folder on Render

Create a **new Static Site** connected to `srslogics/Triveni-Wires`.

| Setting           | Value           |
| ----------------- | --------------- |
| Branch            | `main`          |
| Root Directory    | `petrol-pump`   |
| Build Command     | `npm run build` |
| Publish Directory | `dist`          |

The build copies the static application and inserts Render's `RENDER_EXTERNAL_URL` into share metadata. For a custom domain, set `SITE_URL` to the full HTTPS origin. No install command, database or environment secret is required to build this prototype. Dev dependencies are only needed to run the test suite.

Use a separate Render Static Site for this folder. The repository's existing root build continues to serve the Triveni Wires ERP and corporate website.

The Render URL will be publicly reachable unless you configure access separately. The application only contains fictional sample data, and its role selector is a demo control rather than authentication.

## Professional quality improvements

The financial model now validates stored records before and after a transaction: integer paise, bounded decimal inputs, continuous meter readings, unique IDs, valid cross-record references and closed-shift cash totals. Forms capture their opening revision and reject outdated submissions. Storage conflicts and malformed data are preserved for explicit review; Owner can download a JSON recovery copy. Local storage remains an optimistic browser-local mechanism, with no guarantee of atomic multi-user writes.

UI improvements include larger operational text, stronger secondary-text contrast, larger controls, keyboard-focusable table regions with column headings, page focus after navigation, labelled dialog errors and a visible startup failure message. External font requests were removed. This is targeted accessibility work, not a WCAG conformance certification; browser and assistive-technology checks remain outstanding under the no-browser constraint.

The build uses content-versioned scripts/styles and a Content Security Policy. The included `petrol-pump/render.yaml` configures additional HTTP security headers. To use it, select that Blueprint file when creating the new service. A manually created Static Site does not automatically inherit these headers: add them from the file in Render's Headers settings. The CSP permits inline styles for the charts but disallows inline scripts and external network connections. The HTML policy cannot enforce frame-ancestors; that protection requires the configured HTTP header.

Dependencies are pinned in `package-lock.json`. Run `npm ci --ignore-scripts`, `npm run format:check`, `npm test`, and `npm audit --audit-level=high`. The GitHub Actions workflow applies those checks to this folder.

Design references: [OWASP ASVS](https://asvs.owasp.org/), [OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/). These guide individual improvements; the prototype has not been assessed as compliant with all requirements.

Before production: individual authentication, server-enforced outlet access, transactional database posting and idempotency, immutable audit retention, tested backups/restores, monitoring, incident procedures, device integration testing, and client-approved measurement/accounting rules are still required. No certification or statutory compliance is implied by this prototype.
