import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { getRecentLogs } from "../services/queryLog.js";
import { env } from "../config/env.js";

export const logsRouter = Router();

function safeKeyMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ==========================================
// SECURITY AUDIT: LOGS ENDPOINT AUTH (CONFIDENTIALITY)
// ==========================================
// GET /api/logs is gated by a static bearer token stored in LOGS_API_KEY.
// Without a matching key the endpoint returns 403 — fail-closed: if the
// variable is unset we still refuse access rather than exposing farmer data.
logsRouter.get("/", async (req, res) => {
  const key = env.LOGS_API_KEY;

  // If no key configured, refuse all access — never expose logs publicly.
  if (!key) {
    res.status(403).json({ error: "Logs access is disabled on this server." });
    return;
  }

  const authHeader = req.headers["authorization"] ?? "";
  const provided = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!safeKeyMatch(provided, key)) {
    res.status(403).json({ error: "Forbidden: invalid or missing API key." });
    return;
  }

  const { logs, note } = await getRecentLogs(50);
  res.json({
    logs,
    ...(note ? { note } : {}),
  });
});
