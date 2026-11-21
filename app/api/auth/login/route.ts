import { checkCredentials, loginSchema, startSession } from '@/lib/auth';
import { jsonError, readJson } from '@/lib/http';

export async function POST(req: Request) {
  const body = await readJson(req, 10_000);
  if (!body.ok) return body.response;

  const parsed = loginSchema.safeParse(body.value);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid details.');

  try {
    const user = await checkCredentials(parsed.data.email, parsed.data.password);
    if (!user) return jsonError(401, 'Incorrect email or password.');
    await startSession(user._id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Sign-in failed:', error);
    return jsonError(500, 'Could not sign you in. Please try again.');
  }
}
