import { createApp } from "./src/app.js";
import { connectMongo } from "./src/db/mongo.js";

connectMongo().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn("MongoDB connect failed (non-fatal):", msg);
});

export default createApp();
