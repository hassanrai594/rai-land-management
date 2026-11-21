import { MongoClient, MongoServerError, type Db, type ObjectId } from 'mongodb';
import type { EstateState } from '@/app/validate';

// `_id` is added by MongoDB on insert; reads return WithId<UserDoc> / WithId<SessionDoc>.

/** A registered account. Passwords are only ever stored as a scrypt hash. */
export type UserDoc = {
  name: string;
  email: string; // stored lowercase; unique index
  passwordHash: string;
  createdAt: Date;
};

/** A signed-in browser. The cookie holds a random token; only its SHA-256 hash is stored. */
export type SessionDoc = {
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date; // TTL index: MongoDB deletes the session after this time
};

/** One estate per user. `_id` is the owner's user `_id`. */
export type EstateDoc = {
  _id: ObjectId;
  data: EstateState;
  version: number; // increases on every save; used to reject conflicting saves
  updatedAt: Date;
};

// Cache the connection on globalThis so that requests (and dev hot reloads) share one client.
const globalCache = globalThis as typeof globalThis & { landLedgerDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB connection string to the .env file.');
  }

  let client: MongoClient;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    throw new Error(
      'MONGODB_URI is not a valid connection string. If the password contains special ' +
        'characters, URL-encode them: @ → %40, : → %3A, / → %2F, # → %23, % → %25.',
      { cause: error },
    );
  }
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'land_ledger');
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return db;
  } catch (error) {
    await client.close().catch(() => {});
    // 18 = AuthenticationFailed; 8000 = Atlas's "bad auth"
    if (error instanceof MongoServerError && (error.code === 18 || error.code === 8000)) {
      throw new Error(
        'MongoDB rejected the username or password in MONGODB_URI. Check the database user ' +
          '(Atlas → Security → Database Access), not your Atlas account login.',
        { cause: error },
      );
    }
    throw error;
  }
}

export function getDb(): Promise<Db> {
  globalCache.landLedgerDb ??= connect().catch((error) => {
    globalCache.landLedgerDb = undefined; // let the next request retry
    throw error;
  });
  return globalCache.landLedgerDb;
}

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>('users'),
    sessions: db.collection<SessionDoc>('sessions'),
    estates: db.collection<EstateDoc>('estates'),
  };
}

export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}
