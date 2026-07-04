// Vercel serverless entry point — plain JavaScript ESM.
//
// Why JS, not TS:
//   @vercel/node's esbuild must parse TypeScript AND remap NodeNext-style
//   .js → .ts imports across the full dependency chain. Any ambiguity in
//   that chain causes a silent build failure (no artifact produced → NOT_FOUND).
//   Pre-compiling with tsc and importing the resulting plain JS files
//   removes both steps — esbuild sees standard ESM with concrete file paths.
//
// Build order on Vercel:
//   1. npm install (+ postinstall → tsc creates dist/)
//   2. buildCommand (npm run build) — redundant safety net
//   3. @vercel/node bundles this file + all deps from dist/ and node_modules

import { createApp } from "../dist/app.js";
import { connectMongo } from "../dist/db/mongo.js";

connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
});

export default createApp();
