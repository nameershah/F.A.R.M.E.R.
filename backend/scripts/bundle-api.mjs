import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["api/entry.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "api/index.js",
  logLevel: "info",
});

console.info("Bundled api/index.js for Vercel");
