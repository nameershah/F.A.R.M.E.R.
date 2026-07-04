import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./db/mongo.js";

async function main() {
  // MongoDB is optional — never block startup on logging infrastructure.
  await connectMongo();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.info(
      `F.A.R.M.E.R. backend listening on http://localhost:${env.PORT}`,
    );
  });
}

// Local dev only. Vercel uses backend/index.ts (default export, no listen).
if (!process.env.VERCEL) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Fatal startup error:", message);
    process.exit(1);
  });
}
