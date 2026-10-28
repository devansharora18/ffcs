import { z } from 'zod';

/**
 * A pasted VTOP allocation table is ~10 KB. Keep the ceiling far above that so
 * a whole semester can be pasted, while still bounding a single request.
 */
export const MAX_MESSAGE_CHARS = 120_000;
export const MAX_HISTORY_CHARS = 80_000;

export const messageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(MAX_MESSAGE_CHARS),
    images: z
      .array(z.string().max(3_000_000).startsWith('data:image/'))
      .max(2)
      .optional(),
  })
  .refine((message) => message.content.trim().length > 0 || (message.images?.length ?? 0) > 0, {
    message: 'a message needs text or an image',
  });

export const stateSchema = z.object({
  requirements: z
    .array(
      z.object({
        courseCode: z.string().min(1).max(20),
        offeringId: z.string().max(240).optional(),
        slots: z.array(z.string().max(8)).max(6).optional(),
        custom: z
          .object({
            title: z.string().max(120),
            faculty: z.string().max(80),
            slots: z.array(z.string().max(8)).min(1).max(6),
          })
          .optional(),
      }),
    )
    .max(30),
  constraints: z.object({
    avoidDays: z.array(z.number().int().min(0).max(4)).max(5),
    avoidWindows: z
      .array(z.object({ start: z.number().int().min(0).max(1440), end: z.number().int().min(0).max(1440) }))
      .max(10),
    preferredFaculty: z.array(z.string().max(60)).max(20),
    avoidedFaculty: z.array(z.string().max(60)).max(20),
    maxCredits: z.number().optional(),
  }),
});

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  state: stateSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
