import mongoose from "mongoose";

// Support multiple env var names for the DB connection string
const MONGODB_URI = process.env.DB || process.env.MONGODB_URI || process.env.MONGODB_URL || "";

// Global cache for dev environments
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalAny = globalThis as unknown as Record<string, unknown>;
let cached = globalAny.mongoose as MongooseCache | undefined;

if (!cached) {
  const init: MongooseCache = {
    conn: null,
    promise: null,
  };
  globalAny.mongoose = init as unknown;
  cached = init;
}

// At this point `cached` is guaranteed to be defined
const cache: MongooseCache = cached as MongooseCache;

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!MONGODB_URI) {
    console.warn("DB connection string not provided. Running without DB. Set DB or MONGODB_URI to enable persistence.")
    return cache.conn as unknown as typeof mongoose
  }

  // Basic validation: avoid attempting to connect with malformed connection strings
  if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
    console.warn("DB connection string appears to be invalid or uses an unsupported scheme. Skipping DB connection.")
    return cache.conn as unknown as typeof mongoose
  }

  if (!cache.promise) {
    console.log("🌐 Creating a new MongoDB connection...");
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: "TALENT_BRIDGE",
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
    console.log("✅ MongoDB connected.");
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    // Log the error but do not throw so the app can run in fallback mode
    console.error("MongoDB connection failed:", (error as Error).message || error)
    return cache.conn as unknown as typeof mongoose
  }
}