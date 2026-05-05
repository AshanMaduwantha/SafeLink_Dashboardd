import { MongoClient, GridFSBucket, Db } from "mongodb";
import mongoose, { Mongoose } from "mongoose";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB_NAME || "safelink";

declare global {
  var __mongoClient__: MongoClient | undefined;
  var __mongoosePromise__: Promise<Mongoose> | undefined;
}

export async function connectMongoDB(): Promise<Mongoose> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!global.__mongoosePromise__) {
    global.__mongoosePromise__ = mongoose.connect(uri, { dbName });
  }
  return global.__mongoosePromise__;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (global.__mongoClient__) return global.__mongoClient__;
  const client = new MongoClient(uri);
  await client.connect();
  global.__mongoClient__ = client;
  return client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export async function getGridFS(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "traffic_violation_files" });
}

export const TRAFFIC_VIOLATIONS_COLLECTION = "traffic_violations";
