import mongoose from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }
  return uri;
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __mongooseCache__: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache__ ?? {
  conn: null,
  promise: null,
};

if (!global.__mongooseCache__) {
  global.__mongooseCache__ = cached;
}

export async function connectMongoDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri(), {
      dbName: "SafeLinks",
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}