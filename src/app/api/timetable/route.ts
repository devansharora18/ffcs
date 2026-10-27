import { stateSchema } from '@/lib/agent/schema';
import { catalog } from '@/lib/ffcs/catalog-data';
import { solveTimetable } from '@/lib/ffcs/solver';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { state?: unknown } | null;
  const parsed = stateSchema.safeParse(body?.state);

  if (!parsed.success) {
    return Response.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  return Response.json({ result: solveTimetable(catalog, parsed.data, { limit: 5 }) });
}
