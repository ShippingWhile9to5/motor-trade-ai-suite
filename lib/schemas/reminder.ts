import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A reminder needs a date.");

export const reminderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  // Optional on purpose: a cold call to a firm you have not logged yet still
  // needs a reminder, and it should not force you to create a prospect first.
  business_id: z.string().uuid().nullable().default(null),
  body: z.string(),
  due_date: z.string(),
  done: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createReminderInputSchema = z.object({
  body: z.string().trim().min(1, "What is the reminder?"),
  due_date: isoDate,
  business_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
});

export const updateReminderInputSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(1).optional(),
  due_date: isoDate.optional(),
  done: z.boolean().optional(),
});

export const deleteReminderInputSchema = z.object({
  id: z.string().uuid(),
});

export type Reminder = z.infer<typeof reminderSchema>;
export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;
