export type AgentRoute = "diagnosis" | "weather_market" | "advisory";

export interface DiagnosisResult {
  crop: string;
  condition: string;
  confidence: number;
  visibleSymptoms: string[];
  /** True when Gemini returned unparseable or incomplete JSON. */
  parseError?: boolean;
  rawText?: string;
}

export interface ConfidenceGateResult {
  action: "escalate" | "ai_answer";
  reason: string;
}

export interface QueryResponse {
  answer: string;
  escalated: boolean;
  trace: string[];
}

export interface ImageInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}
