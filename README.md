# Triveni Wires — Corporate website and ERP demo

A branded, browser-local presentation prototype with 16 proposed ERP modules, 11 acting roles, shared sample transactions and owner views for delivery exposure, stock discrepancies and production costing.

## Website and ERP routes

The industrial corporate website opens at `/` and `/website/`. The complete ERP demo is retained at `/erp/`, including the existing demo login, roles and saved records. The website footer links to the ERP. Both routes work with the same Render Static Site and existing settings.

- Website source: `website/` (homepage, product pages, buyer downloads and enquiry scripts).
- ERP source: `public/` (the source directory is retained to preserve the existing tests and offline generator).
- Build output: `dist/` for the website; `dist/website/` for its alias; `dist/erp/` for the ERP.

The website includes the industrial redesign, product/application filtering and multi-product local enquiry drafts. It does not send requests to the company. Approved sales routing is still required. Browser visual QA was not performed at the user's request.

## Deploy on Render

Create a **Static Site**, connect `srslogics/Triveni-Wires`, and select `main`.

| Setting | Value |
| --- | --- |
| Root directory | Leave blank |
| Build command | `npm run build` |
| Publish directory | `dist` |

Alternatively, use Render's **Blueprint** flow with the included `render.yaml`. No database or backend service is needed for this prototype. `RENDER_EXTERNAL_URL` supplies the deployed URL automatically. If using a custom domain, set `SITE_URL` to its complete HTTPS origin and redeploy.

Render references: [Static sites](https://render.com/docs/static-sites), [default environment variables](https://render.com/docs/environment-variables), [Blueprint specification](https://render.com/docs/blueprint-spec).

### Complete workspace startup

The Render build embeds all eight application layers, including the demo sign-in, into the initial HTML, preserving their execution order and separate classic-script scopes. Stylesheets have content-based filenames. This prevents separate script requests from leaving the basic seven-section screen behind or mixing application layers across releases. The sign-in page appears only after all 16 modules and 11 acting roles initialize. A startup error shows a retry message without clearing saved transactions.

After pulling an update, deploy the latest `main` commit with the build and publish settings above. For an existing manually configured Render Static Site, the optional `Cache-Control: no-cache` header on `/*` must be added in the Render dashboard; changing `render.yaml` only updates services managed through a Blueprint. The bundled startup and versioned styles work independently of that header. Role filtering still intentionally limits the modules visible to each selected role.

`npm test` includes a Node-based execution of the generated page, startup failures, storage recovery, all role views, and the connected transaction checks. These checks do not launch a browser or substitute for a visual inspection.

## Demo sign-in

The branded entry page offers all 11 workspaces. Choose **Use demo credentials**, select a workspace, then **Sign in to demo**. The public sample account is `demo@triveniwires.example` / `TriveniDemo`; it is a presentation convenience, not real authentication. Do not enter a company password. All existing role filters and connected records are retained.

Demo access persists across refreshes within a tab through session storage. **Sign out** returns to the entry page without deleting transactions. If storage is unavailable, sign-in still works for the current page. The offline deliverable includes the same entry page. Production access still requires server-backed identity, session management and authorization.

## WhatsApp link preview

Share the **deployed Render HTTPS link** for the website, or append `/erp/` for the ERP demo. The website preview uses the company logo; the ERP retains its branded rectangular preview card. Do not share a localhost or GitHub link with the client. The build inserts the public URL into the initial HTML's Open Graph tags. The ERP page includes a branded 1200 × 630 JPEG, title, description, image dimensions and image alt text; JavaScript execution is not required to discover the card.

After deployment, verify that `/assets/social-preview.jpg` loads publicly and that View Source contains the deployed URL in `og:image` and `og:url`. Then paste the HTTPS link in WhatsApp and allow the preview to load before sending. The receiving app determines the final card layout and may cache earlier previews. A localhost URL cannot provide a remote link preview. Actual WhatsApp appearance remains to be verified after public deployment.

The card uses the [Open Graph protocol](https://ogp.me/). Its editable vector source is `design/social-preview.svg`; the ready-to-serve JPEG is included, so Render needs no image tools.

## Run locally

Requires Node.js 18+ for the build. No npm packages are required.

```sh
npm run build
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765/`. `deliverables/Triveni_Wires_Working_Demo.html` is the self-contained offline copy. Browser storage support for files can vary; the hosted or localhost version is preferable for reliable saved sessions.

## Presentation start

1. Open **Presentation tools → Load meeting data**, then confirm.
2. Owner shows ₹2,12,500 overdue order value, 80 kg stock difference, ₹12,620 cost variance and 500 kg ready to ship.
3. Switch Quality → inspect FG-004 with 3 mm / 110 g/m² → Warehouse → pack FG-004 → Dispatch → ship it → Finance → create its invoice and record a sample collection.
4. For stock adjustment, Warehouse submits the count reason and Finance approves it. The adjustment corrects inventory; it is not recovered cash or achieved savings.
5. Reset demo starts from opening stock. Load meeting data restores the populated owner scenario.

## Files

- `public/`: application source, styles, company images and share card.
- `scripts/`: dependency-free Render build.
- `tests/`: transaction, role, control, recovery and social-metadata checks.
- `docs/`: existing meeting brief, module catalogue and earlier presentation guide. The earlier PDF guide predates the latest role-filtered navigation; use the steps above or the in-app Walkthrough for current controls.
- `deliverables/`: latest self-contained demo.
- `design/`: editable social card.

Run `npm test`. The full audit suite contains 23 test groups; browser checks previously covered 69 role/module screens, mobile overflow, quality-to-cash, approvals, persistence and four download formats. This is not exhaustive security, accessibility or production certification.

## Prototype boundaries

All transaction names and values are fictional. Acting roles and approvals are presentation simulations, not server-enforced authorization. Data is saved on the visitor's own browser, not shared between devices. Integration checks are simulated. The demo has one sales-order/production-order scenario; it does not implement full multi-order ERP, statutory accounting/GST, payroll processing, production authentication, database backups or real factory connections. Routes and acceptance limits require client validation.

Brand imagery is sourced from Triveni Wires' public website. The photographs do not certify the sample manufacturing specification. Do not enter real client, employee or financial data into this prototype.
