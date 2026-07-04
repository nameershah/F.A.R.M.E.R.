import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * PLACEHOLDER — static KP mandi reference table.
 *
 * These figures are illustrative reference values for demo / offline use only.
 * They are NOT live mandi prices and must not be presented as real-time market
 * data. Replace this table with a live feed (e.g. provincial agriculture
 * department or AMIS Pakistan) when available.
 *
 * Units: PKR per 40 kg (maund), approximate mid-range for common KP markets.
 */
const KP_MARKET_PRICE_TABLE: Record<
  string,
  { cropName: string; pricePkrPerMaund: number; unit: string; note: string }
> = {
  wheat: {
    cropName: "wheat",
    pricePkrPerMaund: 3900,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  maize: {
    cropName: "maize",
    pricePkrPerMaund: 3200,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  rice: {
    cropName: "rice",
    pricePkrPerMaund: 5500,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  tomato: {
    cropName: "tomato",
    pricePkrPerMaund: 2800,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  onion: {
    cropName: "onion",
    pricePkrPerMaund: 3500,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  potato: {
    cropName: "potato",
    pricePkrPerMaund: 2200,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  sugarcane: {
    cropName: "sugarcane",
    pricePkrPerMaund: 400,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
  cotton: {
    cropName: "cotton",
    pricePkrPerMaund: 8500,
    unit: "PKR / 40 kg (maund)",
    note: "Static reference placeholder — not a live mandi quote.",
  },
};

export const KNOWN_CROPS = Object.keys(KP_MARKET_PRICE_TABLE);

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
  };
}

/**
 * Deterministic irrigation interpretation — NOT an LLM call.
 *
 * Thresholds operate on Open-Meteo model fields (volumetric soil moisture
 * as m³/m³, ET in mm, VPD in kPa). Same safety rationale as the router and
 * confidence gate: the signal must be inspectable and identical for the
 * same inputs, not a free-form model guess.
 *
 * soil_moisture_0_to_1cm is volumetric (0–1). We expose it as a percentage
 * in the tool payload but keep thresholds on the native fraction.
 */
export function interpretIrrigationSignal(input: {
  soilMoistureFraction: number | null;
  evapotranspirationMm: number | null;
  vaporPressureDeficitKPa: number | null;
}): string {
  const soil = input.soilMoistureFraction;
  const et = input.evapotranspirationMm;
  const vpd = input.vaporPressureDeficitKPa;

  if (soil == null && et == null && vpd == null) {
    return "Insufficient soil/ET data to form an irrigation signal.";
  }

  const soilLow = soil != null && soil < 0.2;
  const etHigh = et != null && et > 3;
  const vpdHigh = vpd != null && vpd > 1.5;

  if (soilLow && etHigh) {
    return "Low soil moisture and high evapotranspiration — irrigation likely needed in the next 24 hours";
  }
  if (soilLow && vpdHigh) {
    return "Low soil moisture and high vapor-pressure deficit — irrigate soon to reduce crop stress";
  }
  if (soilLow) {
    return "Low soil moisture — consider irrigating soon";
  }
  if (etHigh && vpdHigh) {
    return "Soil moisture adequate for now, but high evaporative demand — monitor and be ready to irrigate";
  }
  if (etHigh) {
    return "Soil moisture adequate — no irrigation action needed today, though evaporative demand is elevated";
  }

  return "Soil moisture adequate — no irrigation action needed today";
}

/**
 * Pick the most recent hourly index at or before now; fall back to the
 * first non-null sample if the series is entirely in the future.
 */
function mostRecentHourlyIndex(
  timestamps: string[],
  series: Array<number | null | undefined>[],
): number {
  const now = Date.now();
  let best = -1;

  for (let i = 0; i < timestamps.length; i++) {
    const t = Date.parse(timestamps[i] ?? "");
    if (!Number.isFinite(t) || t > now) continue;
    const hasValue = series.some((s) => typeof s[i] === "number");
    if (hasValue) best = i;
  }

  if (best >= 0) return best;

  for (let i = 0; i < timestamps.length; i++) {
    if (series.some((s) => typeof s[i] === "number")) return i;
  }

  return 0;
}

/**
 * Builds the F.A.R.M.E.R. MCP server exposing weather (Open-Meteo),
 * irrigation signal (Open-Meteo soil/ET), and static KP market-price tools.
 * Intended to be wired via InMemoryTransport inside the same Node process
 * (serverless-friendly; no stdio spawn).
 */
export function createFarmerMcpServer(): McpServer {
  const server = new McpServer({
    name: "farmer-kp-tools",
    version: "1.0.0",
  });

  server.registerTool(
    "get_weather_forecast",
    {
      description:
        "Fetch a short-range weather forecast for a lat/lon using the free Open-Meteo API (no API key).",
      inputSchema: {
        lat: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude in decimal degrees"),
        lon: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees"),
      },
    },
    async ({ lat, lon }) => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set(
        "daily",
        "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
      );
      url.searchParams.set("timezone", "Asia/Karachi");
      url.searchParams.set("forecast_days", "3");

      const response = await fetch(url);
      if (!response.ok) {
        return textResult({
          error: `Open-Meteo request failed with status ${response.status}`,
          lat,
          lon,
        });
      }

      const data = (await response.json()) as {
        daily?: {
          time?: string[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_sum?: number[];
          weathercode?: number[];
        };
      };

      const days =
        data.daily?.time?.map((date, i) => ({
          date,
          tempMaxC: data.daily?.temperature_2m_max?.[i] ?? null,
          tempMinC: data.daily?.temperature_2m_min?.[i] ?? null,
          precipitationMm: data.daily?.precipitation_sum?.[i] ?? null,
          weatherCode: data.daily?.weathercode?.[i] ?? null,
        })) ?? [];

      return textResult({
        source: "Open-Meteo",
        lat,
        lon,
        timezone: "Asia/Karachi",
        forecastDays: days,
      });
    },
  );

  server.registerTool(
    "get_irrigation_signal",
    {
      description:
        "Fetch Open-Meteo hourly soil moisture, evapotranspiration, and VPD, then return a deterministic irrigation signal (not an LLM judgment).",
      inputSchema: {
        lat: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude in decimal degrees"),
        lon: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees"),
      },
    },
    async ({ lat, lon }) => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set(
        "hourly",
        [
          "soil_moisture_0_to_1cm",
          "soil_moisture_1_to_3cm",
          "soil_moisture_3_to_9cm",
          "soil_moisture_9_to_27cm",
          "evapotranspiration",
          "vapor_pressure_deficit",
        ].join(","),
      );
      url.searchParams.set("forecast_days", "3");
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url);
      if (!response.ok) {
        return textResult({
          error: `Open-Meteo irrigation request failed with status ${response.status}`,
          lat,
          lon,
        });
      }

      const data = (await response.json()) as {
        hourly?: {
          time?: string[];
          soil_moisture_0_to_1cm?: Array<number | null>;
          soil_moisture_1_to_3cm?: Array<number | null>;
          soil_moisture_3_to_9cm?: Array<number | null>;
          soil_moisture_9_to_27cm?: Array<number | null>;
          evapotranspiration?: Array<number | null>;
          vapor_pressure_deficit?: Array<number | null>;
        };
      };

      const hourlyTimestamps = data.hourly?.time ?? [];
      const soilTop = data.hourly?.soil_moisture_0_to_1cm ?? [];
      const etSeries = data.hourly?.evapotranspiration ?? [];
      const vpdSeries = data.hourly?.vapor_pressure_deficit ?? [];

      const idx = mostRecentHourlyIndex(hourlyTimestamps, [
        soilTop,
        etSeries,
        vpdSeries,
      ]);

      const soilMoistureFraction =
        typeof soilTop[idx] === "number" ? soilTop[idx]! : null;
      const evapotranspirationMm =
        typeof etSeries[idx] === "number" ? etSeries[idx]! : null;
      const vaporPressureDeficitKPa =
        typeof vpdSeries[idx] === "number" ? vpdSeries[idx]! : null;

      // Open-Meteo soil moisture is volumetric (m³/m³); expose as percent.
      const soilMoistureTopLayerPct =
        soilMoistureFraction == null
          ? null
          : Math.round(soilMoistureFraction * 1000) / 10;

      return textResult({
        soilMoistureTopLayerPct,
        evapotranspirationMm,
        vaporPressureDeficitKPa,
        hourlyTimestamps,
        interpretation: interpretIrrigationSignal({
          soilMoistureFraction,
          evapotranspirationMm,
          vaporPressureDeficitKPa,
        }),
      });
    },
  );

  server.registerTool(
    "get_kp_market_price",
    {
      description:
        "Look up a static reference mandi price for a common KP crop. PLACEHOLDER data only — not a live feed.",
      inputSchema: {
        cropName: z
          .string()
          .min(1)
          .describe("Crop name, e.g. wheat, maize, tomato"),
      },
    },
    async ({ cropName }) => {
      const key = cropName.trim().toLowerCase();
      const entry = KP_MARKET_PRICE_TABLE[key];

      if (!entry) {
        return textResult({
          found: false,
          cropName,
          availableCrops: KNOWN_CROPS,
          note: "Static reference placeholder — not a live mandi quote.",
        });
      }

      return textResult({
        found: true,
        ...entry,
        dataType: "static_placeholder",
      });
    },
  );

  return server;
}
