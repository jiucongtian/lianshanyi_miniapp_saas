import mongoose from 'mongoose';

let connected = false;

export async function connectTestDb(): Promise<void> {
  if (connected) return;
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/lianshanyi_test';
  await mongoose.connect(uri);
  connected = true;
}

export async function disconnectTestDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

/** Drop all collections created during a test suite */
export async function cleanCollections(...names: string[]): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  await Promise.all(
    names.map((n) => db.collection(n).deleteMany({}).catch(() => {})),
  );
}
