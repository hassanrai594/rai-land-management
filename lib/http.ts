export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

/**
 * Reads a JSON request body, rejecting oversized bodies.
 * Requiring `Content-Type: application/json` also blocks cross-site form posts (CSRF):
 * browsers only send that content type cross-origin after a CORS preflight, which we never allow.
 */
export async function readJson(req: Request, maxChars: number): Promise<JsonBody> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { ok: false, response: jsonError(415, 'Expected a JSON request.') };
  }
  const text = await req.text();
  if (text.length > maxChars) {
    return { ok: false, response: jsonError(413, 'Request is too large.') };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid JSON.') };
  }
}
