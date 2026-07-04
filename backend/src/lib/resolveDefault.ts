/** CJS default exports may arrive as `{ default: fn }` when bundled by @vercel/node. */
export function resolveDefault<T>(mod: T | { default: T }): T {
  return (typeof mod === "function" ? mod : (mod as { default: T }).default) as T;
}
