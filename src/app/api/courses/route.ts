import { catalog } from '@/lib/ffcs/catalog-data';
import { searchCourses } from '@/lib/ffcs/search';

export const runtime = 'nodejs';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 8, 1), 20);

  return Response.json({ results: searchCourses(catalog, query, limit) });
}
