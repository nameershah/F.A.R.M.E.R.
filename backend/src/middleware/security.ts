import { createRequire } from "node:module";
import cors from "cors";
import type { RequestHandler } from "express";
import { corsOrigins, env } from "../config/env.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as typeof import("helmet").default;
const rateLimit = require("express-rate-limit") as typeof import("express-rate-limit").default;

export const helmetMiddleware = helmet({
  // Remove X-Powered-By fingerprint
  hidePoweredBy: true,
  // Strict HSTS (1 year; enable once you have TLS in production)
  hsts: {
    maxAge: 31_536_000,
    includeSubDomains: true,
  },
  // Prevent MIME sniffing
  noSniff: true,
  // Deny framing everywhere
  frameguard: { action: "deny" },
  // Block old IE content-type downloads
  ieNoOpen: true,
  // Disable browser XSS filter (modern CSP is the correct control)
  xssFilter: false,
  // Referrer: only send origin cross-origin
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

export const corsMiddleware = cors({
  origin: corsOrigins(),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

/** Rate limit only the agent query endpoint. */
export const queryRateLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many queries. Please wait and try again.",
  },
});
