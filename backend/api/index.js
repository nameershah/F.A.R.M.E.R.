// Vercel serverless entry — bundled by @vercel/node (see vercel.json).
// Imports pre-compiled dist/ output (created by buildCommand → tsc).

import { createApp } from "../dist/app.js";
import { connectMongo } from "../dist/db/mongo.js";

void connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
});

export default createApp();
