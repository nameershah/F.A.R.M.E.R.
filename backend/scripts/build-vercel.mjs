import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["scripts/vercel-entry.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "api/index.js",
  logLevel: "info",
});

console.info("Vercel API bundle written to api/index.js");
