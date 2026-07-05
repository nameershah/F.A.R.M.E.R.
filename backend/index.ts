import express from "express";
import { resolveDefault } from "./src/lib/resolveDefault.js";

const expressFn = resolveDefault(express);

let app: ReturnType<typeof expressFn>;

try {
  const { createApp } = await import("./src/app.js");
  const { connectMongo } = await import("./src/db/mongo.js");

  void connectMongo().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Serverless: MongoDB connect failed (non-fatal):", msg);
  });

  app = createApp();
} catch (err) {
  const detail = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("Serverless startup failed:", detail);
  app = expressFn();
  app.all("*", (_req, res) => {
    const body: { error: string; detail?: string } = { error: "Startup failed" };
    if (process.env.NODE_ENV !== "production") {
      body.detail = detail;
    }
    res.status(500).json(body);
  });
}

export default app;
