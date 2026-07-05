import { z } from "zod";
import { submissionComposerInputSchema } from "./submission-composer";

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
    // Submission Composer state — nullable because a submission created via
    // the free-text draft flow (createSubmissionFromApprovedReview /
    // generateSubmissionFromApprovedReview) has none of this until the
    // composer is opened and saved at least once.
    composer_input: submissionComposerInputSchema.nullable().default(null),
    motor_trade_additional_information: z.string().nullable().default(null),
    material_damage_additional_information: z.string().nullable().default(null),
    underwriter_email: z.string().nullable().default(null),
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

export const saveSubmissionComposerStateInputSchema = z
  .object({
    case_id: z.string().uuid(),
    review_id: z.string().uuid(),
    composer_input: submissionComposerInputSchema,
    motor_trade_additional_information: z.string(),
    material_damage_additional_information: z.string(),
    underwriter_email: z.string(),
  })
  .strict();

export const updateSubmissionInputSchema = z
  .object({
    case_id: z.string().uuid(),
    review_id: z.string().uuid().optional(),
    submission_text: z.string().optional(),
    submission_status: submissionStatusSchema.optional(),
    composer_input: submissionComposerInputSchema.nullable().optional(),
    motor_trade_additional_information: z.string().nullable().optional(),
    material_damage_additional_information: z.string().nullable().optional(),
    underwriter_email: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.review_id !== undefined ||
      input.submission_text !== undefined ||
      input.submission_status !== undefined ||
      input.composer_input !== undefined ||
      input.motor_trade_additional_information !== undefined ||
      input.material_damage_additional_information !== undefined ||
      input.underwriter_email !== undefined,
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
export type SaveSubmissionComposerStateInput = z.infer<
  typeof saveSubmissionComposerStateInputSchema
>;
