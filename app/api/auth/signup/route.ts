import { hashPassword, signupSchema, startSession } from '@/lib/auth';
import { jsonError, readJson } from '@/lib/http';
import { collections, isDuplicateKeyError } from '@/lib/mongodb';

export async function POST(req: Request) {
  const body = await readJson(req, 10_000);
  if (!body.ok) return body.response;

  const parsed = signupSchema.safeParse(body.value);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid details.');
  const { name, email, password } = parsed.data;

  try {
    const { users } = await collections();
    const { insertedId } = await users.insertOne({
      name,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date(),
    });
    await startSession(insertedId);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return jsonError(409, 'An account with this email already exists. Sign in instead.');
    }
    console.error('Sign-up failed:', error);
    return jsonError(500, 'Could not create your account. Please try again.');
  }
}
