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
//   1. npm install
//   2. buildCommand (npm run build / tsc) → creates dist/
//   3. @vercel/node bundles this file + all deps from dist/ and node_modules

let app;

try {
  const [{ createApp }, { connectMongo }] = await Promise.all([
    import("../dist/app.js"),
    import("../dist/db/mongo.js"),
  ]);

  // Fire-and-forget: connectMongo is intentionally not awaited at module level.
  // Vercel reuses warm containers; connection is established on the first cold
  // start and cached. query-log service checks isMongoConnected() before
  // every write and degrades gracefully when Mongo is absent.
  connectMongo().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
  });

  app = createApp();
} catch (err) {
  const detail = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("Serverless startup failed:", detail);
  app = (_req, res) => {
    res.status(500).json({ error: "Startup failed", detail });
  };
}

export default app;
