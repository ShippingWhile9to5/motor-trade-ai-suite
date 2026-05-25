import { z } from "zod";

export const submissionStatusSchema = z.enum([
  "draft",
  "ready",
  "submitted",
]);

export const submissionSchema = z
  .object({
    case_id: z.string().uuid(),
    review_id: z.string().uuid(),
    submission_text: z.string(),
    submission_status: submissionStatusSchema,
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const createSubmissionInputSchema = submissionSchema.omit({
  created_at: true,
});

export const getSubmissionByCaseIdInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export const updateSubmissionInputSchema = z
  .object({
    case_id: z.string().uuid(),
    review_id: z.string().uuid().optional(),
    submission_text: z.string().optional(),
    submission_status: submissionStatusSchema.optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.review_id !== undefined ||
      input.submission_text !== undefined ||
      input.submission_status !== undefined,
    {
      message: "At least one submission field must be provided for update.",
    },
  );

export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionInputSchema>;
export type GetSubmissionByCaseIdInput = z.infer<
  typeof getSubmissionByCaseIdInputSchema
>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionInputSchema>;
