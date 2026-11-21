import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { ObjectId, WithId } from 'mongodb';
import { z } from 'zod';
import { collections, type UserDoc } from './mongodb';

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

export type CurrentUser = { id: ObjectId; name: string; email: string };

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254, 'Email address is too long.');

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100, 'Name is too long.'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(200, 'Password is too long.'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(200, 'Password is too long.'),
});

// ---------------------------------------------------------------------------
// Passwords (scrypt, Node's built-in memory-hard hash)
// Stored format: scrypt$<salt base64>$<hash base64>
// ---------------------------------------------------------------------------

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await deriveKey(password, Buffer.from(salt, 'base64'));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/** Returns the user when the email and password match, otherwise null. */
export async function checkCredentials(
  emailAddress: string,
  password: string,
): Promise<WithId<UserDoc> | null> {
  const { users } = await collections();
  const user = await users.findOne({ email: emailAddress });
  // Hash even when the email is unknown, so response time doesn't reveal which emails exist.
  const stored = user?.passwordHash ?? (await (dummyHash ??= hashPassword('dummy-password')));
  const valid = await verifyPassword(password, stored);
  return user && valid ? user : null;
}

// ---------------------------------------------------------------------------
// Sessions: random token in an httpOnly cookie, SHA-256 of it in MongoDB
// ---------------------------------------------------------------------------

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates a session for the user and sets the session cookie. Call from route handlers only. */
export async function startSession(userId: ObjectId): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const { sessions } = await collections();
  await sessions.insertOne({ tokenHash: hashToken(token), userId, createdAt: now, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

/** Deletes the current session (if any) and clears the cookie. Call from route handlers only. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const { sessions } = await collections();
    await sessions.deleteOne({ tokenHash: hashToken(token) });
  }
  store.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Cached so it runs once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { sessions, users } = await collections();
  const session = await sessions.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await users.findOne({ _id: session.userId });
  return user ? { id: user._id, name: user.name, email: user.email } : null;
});
