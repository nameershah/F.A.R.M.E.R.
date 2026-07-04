# F.A.R.M.E.R. Backend

Futuristic Agriculture & Resource Management Ecosystem Router — AI agent routing for rural agricultural extension in Khyber Pakhtunkhwa, Pakistan (Kaggle x Google AI Agents Intensive, Agents for Good).

## Quick start

```bash
cp .env.example .env
# set GEMINI_API_KEY and GROQ_API_KEY for diagnosis / advisory
npm install
npm run dev
```

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness; reports whether MongoDB logging is connected |
| `POST /api/query` | Multipart `text` + optional `image` → agent orchestration |
| `GET /api/logs` | Last 50 query logs (empty if MongoDB is down) |

## Agents

- **Router** (deterministic): image → diagnosis; weather/market/irrigation keywords → weather_market; else advisory
- **Diagnosis**: Gemini `gemini-2.5-flash` vision
- **Advisory**: Groq `llama-3.3-70b-versatile`
- **Weather & market**: MCP client → in-process MCP server (`get_weather_forecast`, `get_irrigation_signal`, `get_kp_market_price`)
- **Confidence gate** (deterministic): escalate below 0.65 confidence or on high-severity keywords

## Honest limitations

- **Mandi prices** (`get_kp_market_price`) are a static reference table, not a live market feed. They must not be presented as real-time prices.
- **Soil moisture and evapotranspiration** (`get_irrigation_signal`) are real Open-Meteo model estimates, not direct field sensor readings — accurate at a regional scale, not exact for a specific field's soil composition.
- **Diagnosis** is visual AI assistance, not a laboratory confirmation. Low-confidence or high-severity cases escalate to a human extension officer.
- **MongoDB** is optional and used only for non-blocking query logging; the core agent flow works when MongoDB is unreachable.
- Default weather/irrigation coordinates fall back to Peshawar, KP, unless the farmer supplies `lat,lon` in the query text.
