// ==========================================
// WEATHER & MARKET AGENT (MCP + OPEN-METEO)
// ==========================================
// Connects a real MCP client to an in-process MCP server that proxies
// Open-Meteo weather/irrigation data and a static KP market-price table.
// All external fetch calls are wrapped in timeouts so a slow Open-Meteo
// response never hangs the HTTP request indefinitely.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { env } from "../../config/env.js";
import {
  createFarmerMcpServer,
  KNOWN_CROPS,
} from "../mcp/server.js";
import { withTimeout } from "../security/timeout.js";

interface WeatherDay {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
}

interface WeatherPayload {
  source?: string;
  error?: string;
  forecastDays?: WeatherDay[];
  lat?: number;
  lon?: number;
}

interface MarketPayload {
  found?: boolean;
  cropName?: string;
  pricePkrPerMaund?: number;
  unit?: string;
  note?: string;
  availableCrops?: string[];
  dataType?: string;
  error?: string;
}

interface IrrigationPayload {
  error?: string;
  soilMoistureTopLayerPct?: number | null;
  evapotranspirationMm?: number | null;
  vaporPressureDeficitKPa?: number | null;
  hourlyTimestamps?: string[];
  interpretation?: string;
}

/** Matches the router keywords that send irrigation queries to this agent. */
export function wantsIrrigationSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("irrigation") ||
    lower.includes("irrigate") ||
    lower.includes("water my crop")
  );
}

function parseToolJson(result: {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): unknown {
  const textPart = result.content.find((c) => c.type === "text");
  if (!textPart?.text) {
    throw new Error("MCP tool returned no text content");
  }
  return JSON.parse(textPart.text);
}

/**
 * Extract a known crop name from free text for the market-price tool.
 */
export function extractCropName(text: string): string | null {
  const lower = text.toLowerCase();
  for (const crop of KNOWN_CROPS) {
    if (lower.includes(crop)) return crop;
  }
  return null;
}

/**
 * Optional "lat,lon" or "latitude X longitude Y" patterns in the query.
 */
export function extractCoordinates(
  text: string,
): { lat: number; lon: number } | null {
  const pair = text.match(
    /(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/,
  );
  if (pair) {
    const lat = Number(pair[1]);
    const lon = Number(pair[2]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      return { lat, lon };
    }
  }
  return null;
}

/**
 * Weather & market agent: a real MCP *client* talking to our in-process
 * MCP *server* over InMemoryTransport (no stdio child process).
 */
export async function runWeatherMarket(farmerText: string): Promise<string> {
  const server = createFarmerMcpServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({
    name: "farmer-weather-market-client",
    version: "1.0.0",
  });

  try {
    // ==========================================
    // AVAILABILITY: MCP CONNECT TIMEOUT (5s)
    // ==========================================
    // The in-process InMemoryTransport should connect almost instantly.
    // A 5-second timeout guards against any unexpected deadlock.
    await withTimeout(
      Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]),
      5_000,
      "MCP transport connect timed out after 5 s",
    );

    const coords =
      extractCoordinates(farmerText) ?? {
        lat: env.DEFAULT_LAT,
        lon: env.DEFAULT_LON,
      };

    const irrigation = wantsIrrigationSignal(farmerText);

    const wantsWeather =
      /weather|forecast|rain|temperature|humidity|climate|monsoon|drought/i.test(
        farmerText,
      ) || farmerText.trim().length === 0;

    const cropName = extractCropName(farmerText);
    const wantsMarket =
      /market|price|prices|mandi|rate|rates|bazaar|sell/i.test(farmerText) ||
      Boolean(cropName);

    const sections: string[] = [];

    // Irrigation keywords take priority: call get_irrigation_signal instead of
    // the plain daily weather forecast (same Open-Meteo host, soil/ET hourly).
    if (irrigation) {
      // ==========================================
      // AVAILABILITY: MCP TOOL CALL TIMEOUT (8s)
      // ==========================================
      // Each MCP tool call proxies a real Open-Meteo HTTP request.
      // An 8-second timeout ensures a stalled external fetch cannot
      // keep the farmer's request spinning indefinitely.
      const irrigationResult = await withTimeout(
        client.callTool({
          name: "get_irrigation_signal",
          arguments: { lat: coords.lat, lon: coords.lon },
        }),
        8_000,
        "get_irrigation_signal MCP tool call timed out after 8 s",
      );

      const signal = parseToolJson(
        irrigationResult as {
          content: Array<{ type: string; text?: string }>;
        },
      ) as IrrigationPayload;

      if (signal.error) {
        sections.push(
          `Irrigation signal: could not fetch data (${signal.error}).`,
        );
      } else {
        const soil =
          signal.soilMoistureTopLayerPct == null
            ? "n/a"
            : `${signal.soilMoistureTopLayerPct}%`;
        const et =
          signal.evapotranspirationMm == null
            ? "n/a"
            : `${signal.evapotranspirationMm} mm`;
        const vpd =
          signal.vaporPressureDeficitKPa == null
            ? "n/a"
            : `${signal.vaporPressureDeficitKPa} kPa`;

        const interpretation = (
          signal.interpretation ?? "No interpretation available"
        ).replace(/\.\s*$/, "");

        sections.push(
          [
            `Irrigation signal (Open-Meteo model, ${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}):`,
            `Top-layer soil moisture: ${soil}.`,
            `Evapotranspiration: ${et}.`,
            `Vapor-pressure deficit: ${vpd}.`,
            `${interpretation}.`,
            "Note: these are regional model estimates, not on-field sensor readings.",
          ].join(" "),
        );
      }
    } else if (wantsWeather || !wantsMarket) {
      // AVAILABILITY: timeout mirrors the irrigation call above.
      const weatherResult = await withTimeout(
        client.callTool({
          name: "get_weather_forecast",
          arguments: { lat: coords.lat, lon: coords.lon },
        }),
        8_000,
        "get_weather_forecast MCP tool call timed out after 8 s",
      );

      const weather = parseToolJson(
        weatherResult as {
          content: Array<{ type: string; text?: string }>;
        },
      ) as WeatherPayload;

      if (weather.error) {
        sections.push(
          `Weather: could not fetch forecast (${weather.error}).`,
        );
      } else {
        const days = weather.forecastDays ?? [];
        const lines = days.map((d) => {
          const rain =
            d.precipitationMm == null
              ? "rain n/a"
              : `${d.precipitationMm} mm rain`;
          return `${d.date}: ${d.tempMinC ?? "?"}–${d.tempMaxC ?? "?"}°C, ${rain}`;
        });
        sections.push(
          `Weather (Open-Meteo, ${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}, Asia/Karachi):\n${lines.join("\n")}`,
        );
      }
    }

    if (wantsMarket) {
      const crop = cropName ?? "wheat";
      // Market price lookup is in-memory (no external HTTP call) but
      // we still apply the same timeout for consistency.
      const marketResult = await withTimeout(
        client.callTool({
          name: "get_kp_market_price",
          arguments: { cropName: crop },
        }),
        4_000,
        "get_kp_market_price MCP tool call timed out after 4 s",
      );

      const market = parseToolJson(
        marketResult as {
          content: Array<{ type: string; text?: string }>;
        },
      ) as MarketPayload;

      if (market.found && market.pricePkrPerMaund != null) {
        sections.push(
          `Market reference for ${market.cropName}: about ${market.pricePkrPerMaund} ${market.unit ?? "PKR / maund"}. ` +
            `${market.note ?? "Static reference placeholder — not a live mandi quote."} ` +
            "Check your local mandi before selling.",
        );
      } else {
        sections.push(
          `No static reference price for "${crop}". Known crops: ${(market.availableCrops ?? KNOWN_CROPS).join(", ")}. ` +
            "These are placeholder figures only, not live mandi data.",
        );
      }
    }

    return sections.join("\n\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Weather/market MCP agent error:", message);
    return "Weather and market tools are temporarily unavailable. Please try again shortly, or ask your local extension office / mandi for current information.";
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}
