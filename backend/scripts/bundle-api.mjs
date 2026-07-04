import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["scripts/vercel-entry.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "index.js",
  logLevel: "info",
});

console.info("Bundled index.js for Vercel");
