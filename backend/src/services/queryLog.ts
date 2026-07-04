import { isMongoConnected } from "../db/mongo.js";
import { QueryLog } from "../models/QueryLog.js";
import type { AgentRoute } from "../types/index.js";

export interface LogQueryInput {
  text: string;
  hasImage: boolean;
  route: AgentRoute;
  answer: string;
  escalated: boolean;
  trace: string[];
  diagnosisConfidence?: number;
  gateReason?: string;
}

// ==========================================
// SECURITY AUDIT: METADATA LOGGER SERVICE (CONFIDENTIALITY)
// ==========================================
// Records request metadata asynchronously. Never stores the full raw answer,
// reasoning trace, or binary image — only a 100-character answer preview and
// scalar fields are persisted to protect farmer data confidentiality.
// Fire-and-forget: never throws to the caller; never blocks the agent
// response path if MongoDB is down.
export function logQueryAsync(entry: LogQueryInput): void {
  if (!isMongoConnected()) return;

  const answerPreview =
    entry.answer.length > 100
      ? entry.answer.slice(0, 100) + "..."
      : entry.answer;

  const sanitizedDoc = {
    queryText: entry.text,
    hadImage: entry.hasImage,
    intent: entry.route,
    escalated: entry.escalated,
    confidence: entry.diagnosisConfidence,
    answerPreview,
  };

  void QueryLog.create(sanitizedDoc).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn("Query log write failed (non-fatal):", message);
  });
}

export async function getRecentLogs(limit = 50): Promise<{
  logs: unknown[];
  note?: string;
}> {
  if (!isMongoConnected()) {
    return {
      logs: [],
      note: "MongoDB is not connected; query logging is disabled.",
    };
  }

  try {
    const logs = await QueryLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return { logs };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn("Query log read failed (non-fatal):", message);
    return {
      logs: [],
      note: "Could not read query logs; returning empty list.",
    };
  }
}
