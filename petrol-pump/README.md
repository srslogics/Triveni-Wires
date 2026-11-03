# Forecourt — multi-outlet petrol pump prototype

A new, independent client presentation app. It does not modify or share state with Triveni Wires.

## What is implemented

- Owner overview with consolidated or outlet-specific sales, stock, fleet dues, indicative fuel margin and exceptions.
- Three fictional outlets; six tanks and six nozzles; 24 seeded sales with four tender types.
- Sixteen owner screens: Overview, Outlet performance, Sales & nozzles, Tank inventory, Fuel receipts, Shift reconciliation, Fleet & credit, Expenses, Maintenance, Reports, Activity log.
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

The opening screen shows the daily outlet-and-shift register, tank reconciliation, exceptions and tender totals. Historical sample snapshots remain in the demo dataset but are not shown as a trend chart.

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

No pump-controller, ATG, OMC, payment-gateway, banking, accounting or statutory filing integration is connected. Tax treatment, temperature/density normalization, calibrated dip conversion, price changes, meter rollover and refunds remain production scope. Split tenders, recorded nozzle tests/returns, manual settlement matching, receipt-linked supplier bills, bank payments, staff handover and sale-linked draft documents are implemented as browser-local workflows. Prices and limits are illustrative and require client validation.

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

## Operational interface redesign

The overview prioritizes outlet shift status, expected cash, counted differences, low-stock flags and measured tank variance. Open shift links take the selected outlet directly to its reconciliation screen. A compact tender register replaces decorative payment bars and the historical trend chart. Styling uses a restrained navy/white scheme, flat ledger panels, tabular numerals and one responsive layout system. All operational screens retain the same shared data model. Browser visual QA remains unperformed at the user's request.

## Invoices and WhatsApp

Open **Invoices & sharing → Create draft invoice**. Enter the outlet, seller, reference, date, recipient type (Customer, Dealer, Vendor or Other), name, address and optional WhatsApp number including its country code. Add one description, quantity, unit and unit price. The register calculates an integer-paise total and rejects duplicate references, invalid dates/numbers and excessive precision. Staff can preview, download a PDF, or Print / Save PDF, then open a prefilled WhatsApp draft. Download the PDF and attach it manually in WhatsApp before pressing Send. The app does not send a message, upload invoices, check delivery or mark a document sent. No real message is sent by the demo itself.

These are outgoing demonstration drafts, not validated tax invoices. No tax calculation is included; invoice drafts do not post stock, cash, receivables or vendor payables. This feature does not record purchase bills received from vendors. Production invoice numbering, multiple lines, tax treatment, posting, approval and real sending integrations require agreed requirements. Documents are kept only in this browser, scoped by the demo role/outlet. Existing version-1 records without an invoices array remain valid and are upgraded when the first draft is created. PDF download supports English/ASCII text; use Print / Save PDF for other scripts.

### Ready-to-show invoice examples

Owner / All outlets → Invoices & sharing includes three fictional draft documents:

- `DEMO-CUST-001`: Meridian Logistics, Central Avenue, 1,000 L diesel × INR 91.75 = **INR 91,750**.
- `DEMO-VEND-001`: Transit Tanker Services, Airport Road, sample handling-charge recovery = **INR 2,500**. This is an outgoing draft to a vendor, not a purchase bill received from one.
- `DEMO-DEAL-001`: Eastern Fuel Dealers, Highway Junction, 24 sample lubricant cans × INR 450 = **INR 10,800**.

On an existing browser workspace, click **Load sample invoices**. Existing documents and transactions are preserved; repeat loading does not duplicate matching sample references. Station roles load only their selected outlet's example. Click **Preview & share → Set WhatsApp number** to use your own number including country code for the presentation. Numbers are blank initially; WhatsApp opens its recipient picker when no number is set. No message is sent by the application. Download the PDF, open the WhatsApp draft, attach the file, and press Send yourself. All documents remain marked Draft.

## Complete six-workflow demonstration

Owner → All outlets → Overview → **Load complete example**, then confirm. This preserves existing records and posts the following connected sample transactions in Central Avenue. Repeat loading does not duplicate the example. Central's shift must be open, and receipt GR-100 must not already be billed; otherwise use existing records or explicitly reset the demo after exporting a recovery copy.

| Workflow              | Sample / expected result                                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Split sale            | 100 L petrol, INR 10,420: Cash 5,000; UPI 3,000; Card 2,000; Credit 420. Stock falls 100 L; cash rises only 5,000; fleet dues rise only 420.                                                                                                                                |
| Nozzle test & returns | 5 L drawn, then 5 L returned. Meter advances 5 L; no sales revenue; net stock movement zero. Partial returns are supported and excessive returns blocked.                                                                                                                   |
| Digital settlements   | UPI gross 3,000 minus fee 10 matches bank 2,990. Card gross 2,000 minus fee 20 expects 1,980, with bank 1,970 showing a 10 shortfall. No second sale or cash-in-drawer entry is created. Fees are shown in reconciliation and do not automatically post operating expenses. |
| Supplier accounts     | Bill WF-DEMO-BILL for receipt GR-100: INR 4,50,000. Bank payment INR 2,00,000 leaves INR 2,50,000 payable. Bill booking does not add fuel to stock again.                                                                                                                   |
| Staff handover        | Aarav Mehta → Kavita Rao, sample INR 200 cash shortage. Snapshot remains reviewable; the shift stays open. Subsequent sales carry the incoming operator's name.                                                                                                             |
| Sale-linked invoice   | WF-DEMO-INV references the already-posted split sale. It carries the same litres, rate and amount, and creates no duplicate receivable. Download/WhatsApp flow is unchanged.                                                                                                |

Use the corresponding navigation registers to demonstrate and add further entries. Station manager may record tests, returns and handovers. Owner/Accountant may reconcile bank entries and record supplier bills/payments. These are simulated role permissions. Split payment allocations and operator names are included in the sales CSV. Older saved workspaces without the new operations array remain valid.

On the original opening dataset after this complete example, group sales are INR 14,01,340, volume 14,500 L, book stock 70,288 L and fleet outstanding INR 3,90,512. Existing demo actions change these totals, so reset explicitly first if you need exact baseline figures.

The added workflow and DOM regression tests cover all six business flows, duplicate and overpayment guards, meter continuity through testing, partial returns, closed shifts, source invoice integrity, operator attribution and idempotent example loading. Real authentication, a shared database and live external connections have deliberately not been set up, per the user's request to finish the presentation demo first.
