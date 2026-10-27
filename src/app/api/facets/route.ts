import { catalog } from '@/lib/ffcs/catalog-data';
import { categoriesIn } from '@/lib/ffcs/search';

export const runtime = 'nodejs';

export function GET(request: Request): Response {
  const school = new URL(request.url).searchParams.get('school');
  return Response.json({ categories: categoriesIn(catalog, school) });
}
