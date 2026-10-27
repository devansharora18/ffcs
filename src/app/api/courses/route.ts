import { catalog } from '@/lib/ffcs/catalog-data';
import { listByCategory, searchCourses } from '@/lib/ffcs/search';

export const runtime = 'nodejs';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const school = url.searchParams.get('school');
  const category = url.searchParams.get('category');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 8, 1), 200);

  if (category) {
    return Response.json({ results: listByCategory(catalog, category, school, limit) });
  }

  return Response.json({ results: searchCourses(catalog, query, limit, school) });
}
