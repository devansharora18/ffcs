import { z } from 'zod';

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const stateSchema = z.object({
  requirements: z
    .array(
      z.object({
        courseCode: z.string().min(1).max(20),
        offeringId: z.string().max(240).optional(),
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
  messages: z.array(messageSchema).min(1).max(30),
  state: stateSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
