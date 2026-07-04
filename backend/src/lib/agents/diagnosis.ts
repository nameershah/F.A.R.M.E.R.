// ==========================================
// CROP DIAGNOSIS AGENT (GEMINI VISION)
// ==========================================
// Sends crop images to Gemini for structured JSON diagnosis.
// Errors are caught and converted to low-confidence fallback results —
// this function never throws past the route handler.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { DiagnosisResult, ImageInput } from "../../types/index.js";
import { withTimeout } from "../security/timeout.js";

// Module-level singletons — created once, reused across all requests.
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
  }
  return _genAI;
}

// ==========================================
// RESPONSE SCHEMA (INTEGRITY)
// ==========================================
// Zod validates the raw Gemini JSON response to ensure it conforms to the
// expected shape before any field is used downstream.
const diagnosisSchema = z.object({
  crop: z.string(),
  condition: z.string(),
  confidence: z.number().min(0).max(1),
  visibleSymptoms: z.array(z.string()),
});

const DIAGNOSIS_PROMPT = `You are an agricultural plant-health assistant for smallholder farmers in Khyber Pakhtunkhwa, Pakistan.

Analyze the crop image and respond with ONLY valid JSON (no markdown fences, no commentary) matching this exact shape:
{
  "crop": "string — crop name if identifiable, else \\"unknown\\"",
  "condition": "string — brief condition or disease/pest name, or \\"unclear\\"",
  "confidence": 0.0,
  "visibleSymptoms": ["string", "..."]
}

Rules:
- confidence must be a number between 0 and 1 reflecting how sure you are.
- visibleSymptoms lists only symptoms you can actually see in the image.
- Do not invent treatments here; diagnosis only.
- If the image is not a crop/plant, set crop to "unknown", condition to "not a crop image", confidence low.`;

/**
 * Strip optional markdown code fences and extract the first JSON object.
 */
function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function fallbackDiagnosis(rawText: string, reason: string): DiagnosisResult {
  return {
    crop: "unknown",
    condition: "unable to diagnose",
    confidence: 0,
    visibleSymptoms: [],
    parseError: true,
    rawText: `${reason}: ${rawText.slice(0, 500)}`,
  };
}

/**
 * Vision diagnosis via Gemini. Never throws past the route handler —
 * malformed model output becomes a low-confidence fallback result.
 */
export async function runDiagnosis(
  image: ImageInput,
  farmerText?: string,
): Promise<DiagnosisResult> {
  try {
    if (!env.GEMINI_API_KEY) {
      return fallbackDiagnosis(
        "",
        "GEMINI_API_KEY is not configured",
      );
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const userNote = farmerText?.trim()
      ? `\n\nFarmer notes (may be incomplete): ${farmerText.trim()}`
      : "";

    // ==========================================
    // AVAILABILITY: GEMINI CALL TIMEOUT (30s)
    // ==========================================
    // Gemini 2.5 Flash vision calls on large images can take 15–25s at
    // real-world p99. The previous 10s timeout caused unnecessary fallbacks
    // that looked like app lag. 30s keeps us safe without premature failure.
    const result = await withTimeout(
      model.generateContent([
        { text: DIAGNOSIS_PROMPT + userNote },
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.buffer.toString("base64"),
          },
        },
      ]),
      30_000,
      "Gemini vision call timed out after 30 s",
    );

    const rawText = result.response.text() ?? "";
    const jsonText = extractJsonObject(rawText);
    if (!jsonText) {
      return fallbackDiagnosis(rawText, "No JSON object in model response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return fallbackDiagnosis(rawText, "JSON.parse failed");
    }

    const validated = diagnosisSchema.safeParse(parsed);
    if (!validated.success) {
      return fallbackDiagnosis(
        rawText,
        `Schema validation failed: ${validated.error.message}`,
      );
    }

    return validated.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // Never leak API keys if a provider error message embeds them.
    const sanitized = message.replace(/key[=:]\s*\S+/gi, "key=[redacted]");
    return fallbackDiagnosis("", `Gemini request failed: ${sanitized}`);
  }
}

export function formatDiagnosisAnswer(diagnosis: DiagnosisResult): string {
  const symptoms =
    diagnosis.visibleSymptoms.length > 0
      ? diagnosis.visibleSymptoms.join("; ")
      : "none clearly identified";

  return [
    `Crop: ${diagnosis.crop}.`,
    `Likely condition: ${diagnosis.condition}.`,
    `Visible symptoms: ${symptoms}.`,
    `Model confidence: ${(diagnosis.confidence * 100).toFixed(0)}%.`,
    "This is an AI-assisted visual assessment, not a laboratory confirmation. If symptoms worsen, contact your local agriculture extension officer.",
  ].join(" ");
}
