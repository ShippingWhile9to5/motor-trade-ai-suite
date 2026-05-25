import { z } from "zod";

export const caseStatusSchema = z.enum([
  "draft",
  "review",
  "ready",
  "submitted",
  "closed",
]);

export const caseSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
    client_name: z.string().min(1),
    status: caseStatusSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict();

export const documentSchema = z
  .object({
    id: z.string().uuid(),
    case_id: z.string().uuid(),
    file_name: z.string().min(1),
    file_type: z.string().min(1),
    uploaded_at: z.string().datetime(),
  })
  .strict();

export const submissionOutputSchema = z
  .object({
    id: z.string().uuid(),
    case_id: z.string().uuid(),
    submission_text: z.string(),
    created_at: z.string().datetime(),
  })
  .strict();

export type Case = z.infer<typeof caseSchema>;
export type Document = z.infer<typeof documentSchema>;
export type SubmissionOutput = z.infer<typeof submissionOutputSchema>;
