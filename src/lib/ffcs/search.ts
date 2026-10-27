import type { Catalog, CatalogCourse } from './catalog';
import { formatSlots } from './format';
import { slotCells } from './grid';

export type CourseSummary = {
  code: string;
  title: string;
  kind: CatalogCourse['kind'];
  schools: string[];
  offeringCount: number;
  teachers: string[];
  slots: string[];
};

function summarise(course: CatalogCourse): CourseSummary {
  const slots = [...new Set(course.offerings.flatMap((offering) => offering.slots))].sort();
  const teachers = [...new Set(course.offerings.map((offering) => offering.faculty))].sort();

  return {
    code: course.code,
    title: course.title,
    kind: course.kind,
    schools: course.schools,
    offeringCount: course.offerings.length,
    teachers: teachers.slice(0, 3),
    slots,
  };
}

/** Ranked keyword search over code, title and faculty, optionally one school. */
export function searchCourses(
  catalog: Catalog,
  query: string,
  limit = 8,
  school?: string | null,
): CourseSummary[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const tokens = needle.split(/\s+/).filter(Boolean);
  const pool = school
    ? catalog.courses.filter((course) =>
        course.schools.some((name) => name === school || name.startsWith(`${school} (`)),
      )
    : catalog.courses;

  return pool
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

/** Courses in one category, optionally limited to one school. */
export function listByCategory(
  catalog: Catalog,
  category: string,
  school?: string | null,
  limit = 80,
): CourseSummary[] {
  return catalog.courses
    .filter((course) => course.categories.includes(category))
    .filter(
      (course) =>
        !school ||
        course.schools.some((name) => name === school || name.startsWith(`${school} (`)),
    )
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, limit)
    .map(summarise);
}

export function categoriesIn(catalog: Catalog, school?: string | null): string[] {
  const pool = school
    ? catalog.courses.filter((course) =>
        course.schools.some((name) => name === school || name.startsWith(`${school} (`)),
      )
    : catalog.courses;

  return [...new Set(pool.flatMap((course) => course.categories))].sort();
}

/** Every course in one school, for the onboarding picker. */
export function listBySchool(catalog: Catalog, school: string, limit = 200): CourseSummary[] {
  return catalog.courses
    .filter((course) =>
      course.schools.some((name) => name === school || name.startsWith(`${school} (`)),
    )
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, limit)
    .map(summarise);
}

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
