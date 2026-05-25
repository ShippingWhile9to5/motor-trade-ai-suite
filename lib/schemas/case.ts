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
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const createCaseInputSchema = z
  .object({
    user_id: z.string().min(1),
    client_name: z.string().min(1),
    status: caseStatusSchema.default("draft"),
  })
  .strict();

export const getCaseByIdInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

export const listCasesForUserInputSchema = z
  .object({
    user_id: z.string().min(1),
  })
  .strict();

export const updateCaseInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
    client_name: z.string().min(1).optional(),
    status: caseStatusSchema.optional(),
  })
  .strict()
  .refine((input) => input.client_name !== undefined || input.status !== undefined, {
    message: "At least one case field must be provided for update.",
  });

export const documentSchema = z
  .object({
    id: z.string().uuid(),
    case_id: z.string().uuid(),
    file_name: z.string().min(1),
    file_type: z.string().min(1),
    uploaded_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const submissionOutputSchema = z
  .object({
    id: z.string().uuid(),
    case_id: z.string().uuid(),
    submission_text: z.string(),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();

export type Case = z.infer<typeof caseSchema>;
export type CreateCaseInput = z.infer<typeof createCaseInputSchema>;
export type GetCaseByIdInput = z.infer<typeof getCaseByIdInputSchema>;
export type ListCasesForUserInput = z.infer<typeof listCasesForUserInputSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseInputSchema>;
export type Document = z.infer<typeof documentSchema>;
export type SubmissionOutput = z.infer<typeof submissionOutputSchema>;
