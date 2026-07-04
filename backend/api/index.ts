// ==========================================
// VERCEL SERVERLESS ENTRY POINT
// ==========================================
// Vercel invokes this file as a serverless function for every request
// routed to the backend. The Express app is exported as the default
// export — Vercel passes (req, res) to it directly, so no app.listen()
// is needed or allowed here.
//
// connectMongo() runs once at module load time. Vercel reuses warm
// function containers across requests, so the connection is established
// on the first cold start and reused for the lifetime of the container.
// If Mongo is unavailable the function still boots — logging is
// optional and non-blocking (same behaviour as the local dev path).

import { createApp } from "../src/app.js";
import { connectMongo } from "../src/db/mongo.js";

// Fire-and-forget: we intentionally do not await this at the module
// level — serverless functions must not block export. The first
// request may find Mongo not yet connected; the query-log service
// checks isMongoConnected() before writing and degrades gracefully.
connectMongo().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", message);
});

const app = createApp();

export default app;
