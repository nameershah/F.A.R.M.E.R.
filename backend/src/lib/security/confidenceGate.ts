import type { ConfidenceGateResult } from "../../types/index.js";

/**
 * Deterministic confidence gate — NOT an LLM call.
 *
 * Why deterministic: this layer is the last safety check before an AI
 * answer reaches a smallholder farmer. Escalation decisions must be
 * reproducible, logged with an explicit human-readable reason, and
 * reviewable by extension officers. An LLM "safety judge" could be
 * inconsistent, overconfident, or manipulated by adversarial text.
 * Fixed thresholds and keyword lists make the policy inspectable in
 * source control and visible in the orchestration trace — central to
 * F.A.R.M.E.R.'s safety story for the Agents for Good track.
 */

export const CONFIDENCE_THRESHOLD = 0.65;

/** High-severity phrases that always escalate to a human extension officer. */
export const HIGH_SEVERITY_KEYWORDS = [
  "spreading fast",
  "whole field",
  "entire crop",
  "dying",
  "livestock",
  "animal",
  "outbreak",
  "large area",
  "urgent",
] as const;

export interface ConfidenceGateInput {
  /** Raw farmer query text (checked for high-severity keywords). */
  text?: string;
  /**
   * Diagnosis confidence in [0, 1]. Only evaluated when provided
   * (i.e. diagnosis agent ran). Missing confidence does not escalate
   * on the threshold rule alone.
   */
  diagnosisConfidence?: number;
}

export function confidenceGate(
  input: ConfidenceGateInput,
): ConfidenceGateResult {
  const text = (input.text ?? "").toLowerCase();

  const matchedKeyword = HIGH_SEVERITY_KEYWORDS.find((keyword) =>
    text.includes(keyword),
  );

  if (matchedKeyword) {
    return {
      action: "escalate",
      reason: `High-severity keyword detected: "${matchedKeyword}". A human extension officer should review this case.`,
    };
  }

  if (
    typeof input.diagnosisConfidence === "number" &&
    input.diagnosisConfidence < CONFIDENCE_THRESHOLD
  ) {
    return {
      action: "escalate",
      reason: `Diagnosis confidence ${input.diagnosisConfidence.toFixed(2)} is below threshold ${CONFIDENCE_THRESHOLD}. Escalating for human review.`,
    };
  }

  return {
    action: "ai_answer",
    reason: "Passed confidence gate (no high-severity keywords; diagnosis confidence acceptable or not applicable).",
  };
}
