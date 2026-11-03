# Forecourt presentation review — 3 November 2026

## Assessment

The tested workflows support a controlled presentation using fictional data. This review does not establish production readiness or certify accessibility/security compliance. No browser was opened, following the user's instruction.

## Verified

- Live HTTPS page: HTTP 200. All five script files, stylesheet, favicon and 1200 × 630 JPEG preview returned HTTP 200. Content hashes of versioned scripts/styles matched their filenames. The preview metadata uses the correct Render origin.
- Fourteen transaction test groups passed: consolidated totals, meter continuity, sales-to-stock/cash/credit links, credit limits, stock capacity, duplicate receipts, measured stock, shifts, permissions, expenses, maintenance and persistence.
- Node DOM checks rendered 81 role/outlet/module combinations and exercised forms, error messages, escaped user text, exports, print invocation, walkthrough, reset and reload.
- Storage tests covered unavailable storage, invalid saved records, optimistic conflicts, recovery downloads and forms becoming stale after another tab updates the workspace.
- Independent build, content hashes and public metadata checks passed. Formatting checks passed. Dependency audit reported zero known vulnerabilities at review time.
- A presentation calculation was rerun independently through the domain model for the complete sequence below; resulting records passed ledger validation.

## Correction made during this review

Money previously displayed whole rupees even for transactions with paise; fractional litres previously displayed only two decimal places. Display now retains two decimal places for fractional rupees and three for fractional litres. Tests cover ₹123.45, negative cash differences and 0.001 L. Whole-number sample totals retain their clean display.

## Hosting observations

The live deployment serves a CSP in its HTML and X-Content-Type-Options: nosniff. The response did not contain the optional CSP HTTP header, X-Frame-Options or Referrer-Policy HTTP header. The HTML referrer policy is present; frame embedding protection requires the configured HTTP headers. The supplied render.yaml describes the missing headers; a manually created Render Static Site needs those added in its dashboard. These are follow-up hosting improvements, not an indication that the tested presentation workflow failed.

## Preparation

1. Open https://petrol-pump-r5p3.onrender.com/ in the browser you will use at the meeting.
2. Use Owner and All outlets. Download a recovery copy first if you want to preserve previous demo actions. Then Reset sample data and confirm.
3. Keep one demo tab open. Other tabs can trigger conflict protection while a form is open.
4. The operating day is deliberately fixed at **2 November 2026**. Introduce it as yesterday's illustrative operating day, not a live feed. Dates, rates and names are sample values.
5. Open Presentation guide once. Keep the downloaded offline copy available as a connection fallback. File-based browser storage may be unavailable; the app explains temporary-session storage.

## Recommended 10-minute flow

| Step | Action                                                  | Explain / expected result                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Owner → All outlets → Overview                          | One owner view across three sample pumps. Sales ₹13,90,920; volume 14,400 L; book stock 70,388 L; fleet dues ₹3,90,092; indicative fuel margin ₹45,240 before ₹5,450 recorded expenses. Margin is not net profit.                                                                    |
| 2    | Outlet performance → Highway Junction                   | Compare the outlet with the group. Return to All outlets for the next step.                                                                                                                                                                                                          |
| 3    | Tank inventory                                          | Highway diesel is 5,200 L against a 6,000 L reorder point. Measured diesel differences: Central −18 L, Highway −42 L. A difference prompts investigation; it does not prove theft or leakage.                                                                                        |
| 4    | Sales & nozzles → Record meter sale                     | Choose Central Avenue / N01 petrol. Previous meter 242100; enter **242200**, Cash, Save. That is a **100 L increment**, not an individual motorist transaction. Sales rise ₹10,420; Central petrol book stock falls from 9,900 L to 9,800 L; its old measured reading becomes stale. |
| 5    | Fuel receipts → Receive fuel                            | Highway Junction / Tank 2 Diesel. Reference **MEETING-1103**, supplier **Sample depot**, invoiced **5000**, accepted **5000**. Stock becomes 10,200 L and clears the low-stock flag. A repeat of the same reference is blocked.                                                      |
| 6    | Tank inventory → Highway diesel → Record reading        | Enter **10200 L**. This records an illustrative matching observation and clears its old measured variance. Do not suggest automatically assuming physical stock equals book stock in production.                                                                                     |
| 7    | Station manager → Central Avenue → Shift reconciliation | Count & close. After step 4, expected cash is **₹1,85,228**. Enter **185028**, reason **Sample cash shortage for review**. Submit. New sales, collections and expenses for this outlet are blocked while awaiting review.                                                            |
| 8    | Owner → Central Avenue → Shift reconciliation → Approve | Show the ₹200 difference before approval. Approval locks the sample closing; it does not recover the missing cash. Demo roles simulate review; they are not individual logins.                                                                                                       |
| 9    | Owner → Airport Road → Fleet & credit                   | Record a **₹10,000 Bank collection** for Bluebird Travels. Airport's shift must remain open. Fleet dues fall; expected physical cash stays unchanged because this was a bank payment.                                                                                                |
| 10   | Owner → All outlets → Reports                           | Download sales CSV or invoke Print summary. End totals: sales **₹14,01,340**, volume **14,500 L**, stock **75,288 L**, fleet dues **₹3,80,092**, indicative fuel margin **₹45,600**.                                                                                                 |

## Additional screens if asked

- Expenses: a cash expense reduces expected shift cash; Bank/UPI/Card expenses do not.
- Maintenance: create and complete a proposed service task. This records a checklist action, not a verified inspection or certificate.
- Activity log: show the local record of demo actions. It is not an immutable production audit trail.
- Accountant: demonstrate finance-related navigation and one-outlet scope. Switching outlets simulates assignment; access is not enforced by a server.

## Boundaries to explain if asked

Actual staff accounts, multi-user shared data, tax/accounting treatment, split tenders, dispenser testing returns, price changes, meter rollover, ATG/OMC interfaces, supplier payables, settlement matching and tested disaster recovery remain production scope. The historical trend is fictional sample history. No equipment, bank or live depot is connected.

Visual rendering, mobile overflow, actual keyboard/screen-reader behavior, actual printed page layout and actual WhatsApp card appearance were not verified in a real browser or messaging app. Node simulations verify logic and generated markup, not those real-device behaviors. The downloadable recovery JSON has no import workflow yet.
