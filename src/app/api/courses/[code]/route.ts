import { catalog } from '@/lib/ffcs/catalog-data';
import { offeringsOf } from '@/lib/ffcs/search';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await context.params;
  const offerings = offeringsOf(catalog, code);

  if (!offerings) return Response.json({ error: 'not_found' }, { status: 404 });

  return Response.json({ code: code.toUpperCase(), offerings });
}
