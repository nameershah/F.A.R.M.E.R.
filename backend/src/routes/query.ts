import { Router, type Request, type Response } from "express";
import { describeRoute, routeQuery } from "../lib/agents/router.js";
import {
  formatDiagnosisAnswer,
  runDiagnosis,
} from "../lib/agents/diagnosis.js";
import { runAdvisory } from "../lib/agents/advisory.js";
import { runWeatherMarket } from "../lib/agents/weatherMarket.js";
import { confidenceGate } from "../lib/security/confidenceGate.js";
import { queryRateLimiter } from "../middleware/security.js";
import { upload } from "../middleware/upload.js";
import { validateQueryRequest } from "../middleware/validate.js";
import { logQueryAsync } from "../services/queryLog.js";
import { env } from "../config/env.js";
import type { QueryResponse } from "../types/index.js";

export const queryRouter = Router();

const ESCALATION_PREFIX =
  "This case has been flagged for a human agriculture extension officer.";

function buildEscalationAnswer(reason: string, partial?: string): string {
  const parts = [
    ESCALATION_PREFIX,
    reason,
    "Please contact your local KP agriculture extension office or livestock department if animals are involved.",
  ];
  if (partial) {
    parts.push(`Preliminary AI notes (not a final answer): ${partial}`);
  }
  return parts.join(" ");
}

queryRouter.post(
  "/",
  queryRateLimiter,
  (req, res, next) => {
    upload.single("image")(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof Error ? err.message : "Image upload failed";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  },
  validateQueryRequest,
  async (req: Request, res: Response) => {
    const trace: string[] = [];
    const text = typeof req.body.text === "string" ? req.body.text : "";
    const hasImage = Boolean(req.file);

    try {
      const route = routeQuery({ text, hasImage });
      trace.push(describeRoute(route));

      let answer = "";
      let diagnosisConfidence: number | undefined;

      if (route === "diagnosis" && req.file) {
        trace.push("diagnosis: calling Gemini (gemini-2.5-flash) with image");

        const diagnosis = await runDiagnosis(
          {
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
          },
          text,
        );

        diagnosisConfidence = diagnosis.confidence;
        trace.push(
          `diagnosis: crop=${diagnosis.crop}, condition=${diagnosis.condition}, confidence=${diagnosis.confidence.toFixed(2)}${diagnosis.parseError ? " (parse/fallback)" : ""}`,
        );

        const diagnosisSummary = formatDiagnosisAnswer(diagnosis);

        const gate = confidenceGate({
          text,
          diagnosisConfidence,
        });
        trace.push(`confidence_gate: ${gate.action} — ${gate.reason}`);

        if (gate.action === "escalate") {
          answer = buildEscalationAnswer(gate.reason, diagnosisSummary);
          return respond(res, {
            answer,
            escalated: true,
            trace,
            log: {
              text,
              hasImage,
              route,
              answer,
              escalated: true,
              trace,
              diagnosisConfidence,
              gateReason: gate.reason,
            },
          });
        }

        trace.push(`advisory: enriching diagnosis (Groq ${env.GROQ_MODEL})`);
        const advice = await runAdvisory(text, diagnosisSummary);
        answer = `${diagnosisSummary}\n\nAdvice: ${advice}`;
        trace.push("advisory: complete");

        return respond(res, {
          answer,
          escalated: false,
          trace,
          log: {
            text,
            hasImage,
            route,
            answer,
            escalated: false,
            trace,
            diagnosisConfidence,
            gateReason: gate.reason,
          },
        });
      }

      if (route === "weather_market") {
        trace.push(
          "weather_market: MCP client → in-memory MCP server (Open-Meteo weather/irrigation + KP price table)",
        );
        answer = await runWeatherMarket(text);
        trace.push("weather_market: tools complete");
      } else {
        trace.push(`advisory: calling Groq (${env.GROQ_MODEL})`);
        answer = await runAdvisory(text);
        trace.push("advisory: complete");
      }

      const gate = confidenceGate({ text });
      trace.push(`confidence_gate: ${gate.action} — ${gate.reason}`);

      if (gate.action === "escalate") {
        const escalatedAnswer = buildEscalationAnswer(gate.reason, answer);
        return respond(res, {
          answer: escalatedAnswer,
          escalated: true,
          trace,
          log: {
            text,
            hasImage,
            route,
            answer: escalatedAnswer,
            escalated: true,
            trace,
            gateReason: gate.reason,
          },
        });
      }

      return respond(res, {
        answer,
        escalated: false,
        trace,
        log: {
          text,
          hasImage,
          route,
          answer,
          escalated: false,
          trace,
          gateReason: gate.reason,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      const sanitized = message.replace(/key[=:]\s*\S+/gi, "key=[redacted]");
      console.error("Query orchestration error:", sanitized);
      trace.push(`error: ${sanitized}`);
      res.status(500).json({
        answer:
          "Something went wrong while processing your query. Please try again or contact your local extension office.",
        escalated: true,
        trace,
      } satisfies QueryResponse);
    }
  },
);

function respond(
  res: Response,
  payload: QueryResponse & {
    log: Parameters<typeof logQueryAsync>[0];
  },
): void {
  logQueryAsync(payload.log);
  const body: QueryResponse = {
    answer: payload.answer,
    escalated: payload.escalated,
    trace: payload.trace,
  };
  res.json(body);
}
