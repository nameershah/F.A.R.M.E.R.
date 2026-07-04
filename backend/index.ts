import { createApp } from "./src/app.js";
import { connectMongo } from "./src/db/mongo.js";

// Warm-container reuse: connect once per instance, never block export on failure.
void connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
});

// Vercel Fluid compute expects a default-exported Express app — no app.listen().
export default createApp();
