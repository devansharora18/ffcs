import type { StateOp } from '@/lib/ffcs/ops';
import type { CourseSummary, OfferingDetail } from '@/lib/ffcs/search';
import type { SolveResult, TimetableState } from '@/lib/ffcs/types';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  /** Data URLs. Only the newest user message is sent with its images. */
  images?: string[];
};

export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'done'; state: TimetableState; ops: StateOp[]; result: SolveResult }
  | { type: 'error'; message: string }
  | { type: 'unavailable' };

export async function fetchCourses(
  query: string,
  school?: string | null,
  signal?: AbortSignal,
): Promise<CourseSummary[]> {
  const params = new URLSearchParams({ q: query });
  if (school) params.set('school', school);

  const response = await fetch(`/api/courses?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('search failed');
  const payload = (await response.json()) as { results: CourseSummary[] };
  return payload.results;
}

export async function fetchOfferings(
  code: string,
  signal?: AbortSignal,
): Promise<OfferingDetail[]> {
  const response = await fetch(`/api/courses/${encodeURIComponent(code)}`, { signal });
  if (!response.ok) throw new Error('offerings failed');
  const payload = (await response.json()) as { offerings: OfferingDetail[] };
  return payload.offerings;
}

export async function fetchCategories(
  school: string | null,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams();
  if (school) params.set('school', school);

  const response = await fetch(`/api/facets?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('facets failed');
  const payload = (await response.json()) as { categories: string[] };
  return payload.categories;
}

export async function fetchCategoryCourses(
  category: string,
  school: string | null,
  signal?: AbortSignal,
): Promise<CourseSummary[]> {
  const params = new URLSearchParams({ category, limit: '120' });
  if (school) params.set('school', school);

  const response = await fetch(`/api/courses?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('courses failed');
  const payload = (await response.json()) as { results: CourseSummary[] };
  return payload.results;
}

export async function fetchSchoolCourses(
  school: string,
  signal?: AbortSignal,
): Promise<CourseSummary[]> {
  const response = await fetch(`/api/courses?school=${encodeURIComponent(school)}&limit=200`, {
    signal,
  });
  if (!response.ok) throw new Error('courses failed');
  const payload = (await response.json()) as { results: CourseSummary[] };
  return payload.results;
}

export async function solveState(state: TimetableState): Promise<SolveResult> {
  const response = await fetch('/api/timetable', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) throw new Error('solve failed');
  const payload = (await response.json()) as { result: SolveResult };
  return payload.result;
}

export async function agentConfigured(): Promise<boolean> {
  const response = await fetch('/api/chat');
  if (!response.ok) return false;
  const payload = (await response.json()) as { configured: boolean };
  return payload.configured;
}

export async function* streamChat(
  body: { messages: ChatMessage[]; state: TimetableState },
  signal: AbortSignal,
): AsyncGenerator<ChatEvent> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    yield { type: 'error', message: 'Could not reach the agent.' };
    return;
  }

  if (response.status === 503) {
    yield { type: 'unavailable' };
    return;
  }

  if (!response.ok || !response.body) {
    yield { type: 'error', message: `Agent request failed (${response.status}).` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');

      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (!event || !data) continue;

      try {
        yield { type: event, ...(JSON.parse(data) as object) } as ChatEvent;
      } catch {
        // A malformed frame is not worth failing the whole turn.
      }
    }
  }
}
