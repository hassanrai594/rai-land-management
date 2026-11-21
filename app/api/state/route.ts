import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson } from '@/lib/http';
import { collections, isDuplicateKeyError } from '@/lib/mongodb';
import { migratePlan } from '../../migrate-plan';
import { stateSchema } from '../../validate';

const MAX_BODY_CHARS = 4_000_000;
const CONFLICT_MESSAGE = 'Data changed in another window. Reload before editing.';

const saveSchema = z.object({
  version: z.number().int().nonnegative(),
  data: stateSchema,
});

/** Load the signed-in user's estate. `data: null` means they haven't saved anything yet. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, 'Sign in to access your estate.');

    const { estates } = await collections();
    const estate = await estates.findOne({ _id: user.id });
    return Response.json(
      estate
        ? { data: migratePlan(estate.data), version: estate.version }
        : { data: null, version: 0 },
    );
  } catch (error) {
    console.error('Loading estate failed:', error);
    return jsonError(500, 'Could not load your estate. Please try again.');
  }
}

/**
 * Save the whole estate. The client sends the version it loaded; the save only succeeds if the
 * stored version still matches, so two open windows can't silently overwrite each other.
 */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, 'Sign in required.');

    const body = await readJson(req, MAX_BODY_CHARS);
    if (!body.ok) return body.response;

    const parsed = saveSchema.safeParse(body.value);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid records.');
    }
    const { version } = parsed.data;
    const data = migratePlan(parsed.data.data);
    const updatedAt = new Date();
    const { estates } = await collections();

    if (version === 0) {
      // First save: create the estate. Fails with a duplicate key if another window got there first.
      await estates.insertOne({ _id: user.id, data, version: 1, updatedAt });
    } else {
      const result = await estates.updateOne(
        { _id: user.id, version },
        { $set: { data, updatedAt }, $inc: { version: 1 } },
      );
      if (result.matchedCount === 0) return jsonError(409, CONFLICT_MESSAGE);
    }
    return Response.json({ version: version + 1 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return jsonError(409, CONFLICT_MESSAGE);
    console.error('Saving estate failed:', error);
    return jsonError(500, 'Could not save. Please try again.');
  }
}
