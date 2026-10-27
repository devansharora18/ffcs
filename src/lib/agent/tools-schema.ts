import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_courses',
      description:
        'Search the catalog by course code, title words or faculty name. Call this before naming any course. Returns code, title, kind, faculty count and available slots.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Course code, title words, or faculty name.' },
          school: {
            type: 'string',
            description:
              'Optional school filter: SCOPE, SCORE, SENSE, SELECT, SMEC, SHINE, SBST, SCHEME, MTech. Pass it whenever the user names a school.',
          },
          limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Max results. Default 8.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_offerings',
      description:
        'List every faculty/slot/venue offering of one course code. Call this when the user asks who teaches a course or which slots it runs in.',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', description: 'Exact course code, e.g. BCSE202L.' } },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'who_teaches',
      description:
        'List the faculty teaching a given slot code, with the courses they teach in it. Use for questions like "who teaches A1" or "which teachers are free in TB2".',
      parameters: {
        type: 'object',
        properties: {
          slot: {
            type: 'string',
            description: 'Slot code: theory A1–G2, TA1–TDD2; labs L1–L60. E.g. A1, TA1, L3.',
          },
        },
        required: ['slot'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_course',
      description:
        'Add a course to the timetable. Omit faculty to let the solver choose an offering — that is the normal path for "add <course>". Pass faculty only when the user named a specific teacher.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Course code, e.g. BCSE202L.' },
          faculty: {
            type: 'string',
            description: 'Only when the user named a teacher. Exact name or a unique fragment.',
          },
          school: {
            type: 'string',
            description:
              'Only when the user named a school. The tool refuses the add if the course is not in that school.',
          },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_course',
      description: 'Remove a course from the timetable by code.',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', description: 'Course code.' } },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_constraints',
      description:
        'Replace timetable constraints. Arrays replace the previous value. Use clear:true to reset everything.',
      parameters: {
        type: 'object',
        properties: {
          avoidDays: {
            type: 'array',
            items: { type: 'string' },
            description: 'Days to keep free: "mon".."fri" or 0–4.',
          },
          avoidWindows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'HH:MM' },
                end: { type: 'string', description: 'HH:MM' },
              },
              required: ['start', 'end'],
            },
            description: 'Time windows to keep free on every day, e.g. 08:00–09:00.',
          },
          preferredFaculty: {
            type: 'array',
            items: { type: 'string' },
            description: 'Faculty names to favour.',
          },
          avoidedFaculty: {
            type: 'array',
            items: { type: 'string' },
            description: 'Faculty names to never place.',
          },
          clear: { type: 'boolean', description: 'Reset all constraints first.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'solve',
      description:
        'Return the current best clash-free arrangement for the courses already added. Call after any change to confirm the result.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export const TOOL_NAMES = new Set(
  toolDefinitions
    .map((tool) => (tool.type === 'function' ? tool.function.name : ''))
    .filter(Boolean),
);
