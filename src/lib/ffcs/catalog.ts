/**
 * Shape of the generated catalog that ships with the build.
 *
 * `kind` is derived from the slot codes, not from the course-code suffix:
 * MTech codes carry no suffix at all, and embedded courses publish their theory
 * and lab hours as separate offerings under one code.
 */

export type OfferingKind = 'theory' | 'lab' | 'embedded';

export type CourseKind = OfferingKind | 'unscheduled';

export type CatalogOffering = {
  /** Stable across re-imports: derived from course, slots, faculty and venue. */
  id: string;
  faculty: string;
  venue: string | null;
  /** Slot codes as published, e.g. ['A1', 'TA1'] or ['L3', 'L4']. */
  slots: string[];
};

export type CatalogCourse = {
  code: string;
  title: string;
  kind: CourseKind;
  /** The source dataset carries no credit values. Never guess these. */
  credits: number | null;
  schools: string[];
  categories: string[];
  offerings: CatalogOffering[];
};

export type Catalog = {
  campus: string;
  term: string | null;
  source: string;
  stats: {
    courses: number;
    offerings: number;
    faculties: number;
  };
  courses: CatalogCourse[];
};
