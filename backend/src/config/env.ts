import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .catch("production"),
  // ==========================================
  // CORS AND SECURITY CONFIGURATION
  // ==========================================
  // CORS_ALLOWED_ORIGIN defines which frontend origin is allowed to send requests
  // to this API. It defaults to port 5173 but can be overridden (e.g., to 5174)
  // in backend/.env to prevent cross-origin resource sharing failures.
  CORS_ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  GEMINI_API_KEY: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  /** Faster 8B model by default; override with llama-3.3-70b-versatile for quality. */
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  MONGODB_URI: z.string().optional().default(""),
  // ==========================================
  // CONFIDENTIALITY: LOGS ACCESS KEY
  // ==========================================
  // Protects GET /api/logs from unauthenticated public access.
  // Set to any strong random string. If unset, the logs endpoint
  // returns 403 for all callers — fail-closed by design.
  LOGS_API_KEY: z.string().optional().default(""),
  DEFAULT_LAT: z.coerce.number().default(34.0151),
  DEFAULT_LON: z.coerce.number().default(71.5249),
});

/** Vercel often stores unset vars as "" — treat those as missing so defaults apply. */
function cleanEnvValue(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function envForParse(
  source: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      cleanEnvValue(value),
    ]),
  );
}

const parsed = envSchema.safeParse(envForParse(process.env));

if (!parsed.success) {
  // Throw instead of process.exit so that:
  // - Local: caught by main().catch() which logs and exits cleanly.
  // - Serverless (Vercel): the runtime catches the module-load error
  //   and returns a 500 without killing the underlying container.
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`,
  );
}

export const env = parsed.data;

// ==========================================
// CORS ALLOWED ORIGINS RESOLVER
// ==========================================
// Parses the CORS_ALLOWED_ORIGIN string (comma-separated list) or returns wildcard boolean.
export function corsOrigins(): string[] | boolean {
  const raw = env.CORS_ALLOWED_ORIGIN.trim();
  if (raw === "*") return true;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}
