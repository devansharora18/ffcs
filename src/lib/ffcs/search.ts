import type { Catalog, CatalogCourse } from './catalog';
import { formatSlots } from './format';
import { slotCells } from './grid';

export type CourseSummary = {
  code: string;
  title: string;
  kind: CatalogCourse['kind'];
  offeringCount: number;
  teachers: string[];
  slots: string[];
};

export function summarise(course: CatalogCourse): CourseSummary {
  const slots = [...new Set(course.offerings.flatMap((offering) => offering.slots))].sort();
  const teachers = [...new Set(course.offerings.map((offering) => offering.faculty))].sort();

  return {
    code: course.code,
    title: course.title,
    kind: course.kind,
    offeringCount: course.offerings.length,
    teachers: teachers.slice(0, 3),
    slots,
  };
}

/** Ranked keyword search over code, title and faculty. */
export function searchCourses(catalog: Catalog, query: string, limit = 8): CourseSummary[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const tokens = needle.split(/\s+/).filter(Boolean);

  return catalog.courses
    .map((course) => {
      const haystack = `${course.code} ${course.title}`.toLowerCase();
      const titleHit = tokens.every((token) => haystack.includes(token));
      const facultyHit = tokens.every((token) =>
        course.offerings.some((offering) => offering.faculty.toLowerCase().includes(token)),
      );
      if (!titleHit && !facultyHit) return null;

      const score =
        (titleHit ? 10 : 0) +
        (facultyHit ? 3 : 0) +
        (course.code.toLowerCase() === needle ? 50 : 0) +
        (course.code.toLowerCase().startsWith(tokens[0]) ? 2 : 0);

      return { score, course };
    })
    .filter((match): match is { score: number; course: CatalogCourse } => match !== null)
    .sort((a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code))
    .slice(0, limit)
    .map((match) => summarise(match.course));
}

export type OfferingDetail = {
  id: string;
  faculty: string;
  venue: string | null;
  slots: string;
  cells: ReturnType<typeof slotCells>;
};

export function offeringsOf(catalog: Catalog, code: string): OfferingDetail[] | null {
  const needle = code.trim().toLowerCase();
  const course = catalog.courses.find((item) => item.code.toLowerCase() === needle);
  if (!course) return null;

  return course.offerings.map((offering) => ({
    id: offering.id,
    faculty: offering.faculty,
    venue: offering.venue,
    slots: formatSlots(offering.slots),
    cells: offering.slots.flatMap(slotCells),
  }));
}
