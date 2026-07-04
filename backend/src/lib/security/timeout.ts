// ==========================================
// SECURITY AUDIT: TIMEOUT WRAPPER UTILITY (AVAILABILITY)
// ==========================================
// A promise-based timeout wrapper to prevent external API calls (e.g. Gemini,
// Groq, or MCP tools) from hanging indefinitely and exhausting server resources.

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Request timed out",
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
