import { endSession } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function POST() {
  try {
    await endSession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Sign-out failed:', error);
    return jsonError(500, 'Could not sign you out. Please try again.');
  }
}
