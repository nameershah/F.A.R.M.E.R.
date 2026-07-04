import mongoose from "mongoose";
import { env } from "../config/env.js";
import { resolveDefault } from "../lib/resolveDefault.js";

const mongooseFn = resolveDefault(mongoose);

let connected = false;

/**
 * Optional, non-blocking MongoDB connection for query logging only.
 * Core agent orchestration must succeed even when this returns false.
 */
export async function connectMongo(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.info("MongoDB URI not set — query logging disabled.");
    connected = false;
    return false;
  }

  try {
    mongooseFn.set("strictQuery", true);
    await mongooseFn.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    connected = true;
    console.info("MongoDB connected for optional query logging.");
    return true;
  } catch (err) {
    connected = false;
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn(
      `MongoDB unavailable — continuing without query logging: ${message}`,
    );
    return false;
  }
}

export function isMongoConnected(): boolean {
  return connected && mongooseFn.connection.readyState === 1;
}

mongooseFn.connection.on("disconnected", () => {
  connected = false;
});

mongooseFn.connection.on("connected", () => {
  connected = true;
});
