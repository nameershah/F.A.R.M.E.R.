import type { QueryResponse, HealthResponse } from "../types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

/**
 * Helper to fetch with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. The server did not respond within 20 seconds.");
    }
    throw error;
  }
}

/**
 * Submits query text and optional image to F.A.R.M.E.R. routing endpoint.
 */
export async function submitQuery(text?: string, image?: File | null): Promise<QueryResponse> {
  const formData = new FormData();
  if (text !== undefined && text !== "") {
    formData.append("text", text);
  }
  if (image) {
    formData.append("image", image);
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/query`, {
      method: "POST",
      body: formData,
    }, 65_000);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const errorMessage =
        data?.error || data?.message || `Server responded with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data: QueryResponse = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to submit query. Please verify your connection.");
  }
}

/**
 * Polls backend health check.
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/health`, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const errorMessage =
        data?.error || data?.message || `Health check status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data: HealthResponse = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("System health check failed. Server might be offline.");
  }
}
