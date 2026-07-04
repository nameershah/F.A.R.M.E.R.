import mongoose from "mongoose";
import { env } from "../config/env.js";
import { resolveDefault } from "../lib/resolveDefault.js";

const mongooseFn = resolveDefault(mongoose);

let connected = false;
/** Cached in-flight connect — reused across warm invocations in one instance. */
let connectPromise: Promise<boolean> | null = null;

/**
 * Optional, non-blocking MongoDB connection for query logging only.
 * Core agent orchestration must succeed even when this returns false.
 *
 * Serverless-safe: skips reconnect when already connected, deduplicates
 * concurrent connect attempts, and uses a small pool (maxPoolSize: 1).
 */
export async function connectMongo(): Promise<boolean> {
  if (isMongoConnected()) return true;

  if (!env.MONGODB_URI) {
    console.info("MongoDB URI not set — query logging disabled.");
    connected = false;
    return false;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      mongooseFn.set("strictQuery", true);
      await mongooseFn.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15_000,
        maxPoolSize: 1,
      });
      connected = true;
      console.info("MongoDB connected for optional query logging.");
      return true;
    } catch (err) {
      connected = false;
      connectPromise = null;
      const message = err instanceof Error ? err.message : "unknown error";
      console.warn(
        `MongoDB unavailable — continuing without query logging: ${message}`,
      );
      return false;
    }
  })();

  return connectPromise;
}

export function isMongoConnected(): boolean {
  return connected && mongooseFn.connection.readyState === 1;
}

mongooseFn.connection.on("disconnected", () => {
  connected = false;
  connectPromise = null;
});

mongooseFn.connection.on("connected", () => {
  connected = true;
});
