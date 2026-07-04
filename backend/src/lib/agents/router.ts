import type { AgentRoute } from "../../types/index.js";

/**
 * Deterministic router — NOT an LLM call.
 *
 * Why deterministic: routing decides which specialist agent (and which
 * external APIs / cost centers) run for a farmer's query. An LLM router
 * can hallucinate a route, flip under prompt injection, or silently change
 * behavior across model versions. For a safety-critical agricultural
 * extension system, route selection must be inspectable, unit-testable,
 * and identical for the same inputs every time — so reviewers and field
 * officers can audit "why did this go to diagnosis?" without trusting a
 * black-box judgment call.
 *
 * Priority (first match wins):
 *  1. Image attached  → diagnosis
 *  2. Weather/market keywords in text → weather_market
 *  3. Everything else → advisory
 */

const WEATHER_MARKET_KEYWORDS = [
  "weather",
  "forecast",
  "rain",
  "rainfall",
  "temperature",
  "humidity",
  "climate",
  "monsoon",
  "drought",
  "irrigation",
  "irrigate",
  "water my crop",
  "market",
  "price",
  "prices",
  "mandi",
  "rate",
  "rates",
  "bazaar",
  "sell",
  "selling",
  "crop price",
] as const;

export function routeQuery(input: {
  text?: string;
  hasImage: boolean;
}): AgentRoute {
  if (input.hasImage) {
    return "diagnosis";
  }

  const normalized = (input.text ?? "").toLowerCase();
  const hitsWeatherMarket = WEATHER_MARKET_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );

  if (hitsWeatherMarket) {
    return "weather_market";
  }

  return "advisory";
}

export function describeRoute(route: AgentRoute): string {
  switch (route) {
    case "diagnosis":
      return "router: image attached → diagnosis agent";
    case "weather_market":
      return "router: weather/market keywords matched → weather_market agent";
    case "advisory":
      return "router: default → advisory agent";
  }
}
