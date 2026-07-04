// ==========================================
// ADVISORY AGENT (GROQ — LLaMA 3.3 70B)
// ==========================================
// Produces short, practical plain-language advice for smallholder farmers.
// Errors are caught and returned as farmer-safe messages; this function
// never throws past the route handler.

import Groq from "groq-sdk";
import { env } from "../../config/env.js";
import { withTimeout } from "../security/timeout.js";

// Module-level singleton — created once, reused across all requests.
let _groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return _groqClient;
}

const SYSTEM_PROMPT = `You are an agricultural extension advisor for smallholder farmers in rural Khyber Pakhtunkhwa (KP), Pakistan.

Rules:
- Reply in 3–5 short, practical sentences. No jargon.
- Use plain language a farmer can act on today (water, shade, spacing, when to seek help).
- Never claim certainty you do not have. Prefer phrases like "this often means", "you might try", "consider checking".
- Do not invent pesticide brand names or illegal recommendations.
- If the question is outside farming, politely say you can only help with crops, weather, and basic farm practices.
- Do not mention that you are an AI model unless asked.`;

/**
 * Practical text advisory via Groq (llama-3.3-70b-versatile).
 * Errors are returned as farmer-safe messages; never throws past the route.
 */
export async function runAdvisory(
  farmerText: string,
  context?: string,
): Promise<string> {
  try {
    if (!env.GROQ_API_KEY) {
      return "Advisory is temporarily unavailable because the language model is not configured. Please contact your local agriculture extension office for guidance.";
    }

    const groq = getGroqClient();

    const userContent = context
      ? `Farmer question:\n${farmerText || "(no text — use diagnosis context only)"}\n\nAdditional context from other agents:\n${context}`
      : farmerText || "I need general advice for keeping my crops healthy in KP.";

    // ==========================================
    // AVAILABILITY: GROQ CALL TIMEOUT (12s)
    // ==========================================
    // Wraps the Groq chat completion call in a 12-second timeout.
    // If the provider is slow or unresponsive, the promise rejects and the
    // catch block below returns a clear farmer-safe message instead of
    // leaving the HTTP request hanging indefinitely.
    const completion = await withTimeout(
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
      12_000,
      "Groq advisory call timed out after 12 s",
    );

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return "I could not generate advice right now. Please try again or speak with your local extension officer.";
    }

    return answer;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // Sanitise before logging to prevent accidental key exposure.
    const sanitized = message.replace(/key[=:]\s*\S+/gi, "key=[redacted]");
    console.error("Advisory agent error:", sanitized);
    return "Advisory is temporarily unavailable. Please try again shortly, or contact your local agriculture extension office.";
  }
}
