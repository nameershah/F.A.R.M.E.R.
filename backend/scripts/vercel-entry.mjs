import { createApp } from "../dist/app.js";
import { connectMongo } from "../dist/db/mongo.js";

connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
});

export default createApp();
