import { createApp } from "./src/app.js";
import { connectMongo } from "./src/db/mongo.js";

void connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
});

export default createApp();
