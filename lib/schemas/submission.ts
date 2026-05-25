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

export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type Submission = z.infer<typeof submissionSchema>;
