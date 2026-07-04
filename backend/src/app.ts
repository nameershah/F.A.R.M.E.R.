import express from "express";
import { resolveDefault } from "./lib/resolveDefault.js";
import {
  corsMiddleware,
  helmetMiddleware,
} from "./middleware/security.js";
import { healthRouter } from "./routes/health.js";
import { logsRouter } from "./routes/logs.js";
import { queryRouter } from "./routes/query.js";

const expressFn = resolveDefault(express);

let cachedApp: ReturnType<typeof expressFn> | undefined;

export function createApp() {
  if (cachedApp) return cachedApp;

  const app = expressFn();

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "32kb" }));
  app.use(express.urlencoded({ extended: true, limit: "32kb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "F.A.R.M.E.R.",
      description:
        "Futuristic Agriculture & Resource Management Ecosystem Router",
      endpoints: ["/api/health", "/api/query", "/api/logs"],
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/logs", logsRouter);
  app.use("/api/query", queryRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err instanceof Error ? err.message : "Internal error";
      const sanitized = message.replace(/key[=:]\s*\S+/gi, "key=[redacted]");
      console.error("Unhandled error:", sanitized);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  cachedApp = app;
  return app;
}
