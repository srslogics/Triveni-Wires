import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
for (const key of ["SITE_URL", "RENDER_EXTERNAL_URL"]) {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    env: {
      ...process.env,
      SITE_URL: "",
      RENDER_EXTERNAL_URL: "",
      [key]: "https://fuel.example.com",
    },
  });
  const html = readFileSync("dist/index.html", "utf8");
  assert(html.includes('content="https://fuel.example.com/"'));
  assert(html.includes("Content-Security-Policy"));
  assert(!html.includes("__SITE_URL__"));
  for (const [, name, hash] of html.matchAll(
    /(?:src|href)="([^"]+\.([a-f0-9]{12})\.(?:js|css))"/g,
  ))
    assert.equal(
      createHash("sha256")
        .update(readFileSync("dist/" + name))
        .digest("hex")
        .slice(0, 12),
      hash,
    );
  assert(!html.includes(".chatgpt.site"));
  for (const [, name] of html.matchAll(/(?:src|href)="([^"#]+)"/g))
    if (!name.startsWith("http")) assert(existsSync("dist/" + name), name);
  for (const name of ["app.js", "core.js", "style.css", "favicon.svg"])
    assert.equal(
      readFileSync("dist/" + name, "utf8"),
      readFileSync("public/" + name, "utf8"),
    );
}
assert.throws(() =>
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    env: { ...process.env, SITE_URL: "https://fuel.example.com/bad-path" },
    stdio: "pipe",
  }),
);
execFileSync(process.execPath, ["scripts/build.mjs"], {
  env: { ...process.env, SITE_URL: "", RENDER_EXTERNAL_URL: "", RENDER: "" },
});
console.log(
  "PASS independent Render build; all static assets; environment URL; custom domain; invalid URL rejected",
);
