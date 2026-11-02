import { createHash } from "node:crypto";
import { cp, readFile, writeFile, rm } from "node:fs/promises";
const configured = process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL;
if (process.env.RENDER && !configured)
  throw new Error("Set SITE_URL to the deployed HTTPS origin.");
const url = new URL(configured || "http://localhost:8770");
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash
)
  throw new Error(
    "SITE_URL must be an HTTP(S) origin without a path, query or credentials.",
  );
if (configured && url.protocol !== "https:")
  throw new Error("The public Site URL must use HTTPS.");
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
let html = (await readFile("dist/index.html", "utf8")).replaceAll(
  "__SITE_URL__",
  url.origin,
);
const policy =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
html = html.replace(
  "<head>",
  `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`,
);
for (const name of [
  "boot.js",
  "storage.js",
  "core.js",
  "app.js",
  "style.css",
]) {
  const source = await readFile("public/" + name),
    hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const versioned = name.replace(/\.(js|css)$/, `.${hash}.$1`);
  await writeFile("dist/" + versioned, source);
  html = html.replaceAll('"' + name + '"', '"' + versioned + '"');
}
await writeFile("dist/index.html", html);
console.log("Built Forecourt petrol pump prototype in dist/");
