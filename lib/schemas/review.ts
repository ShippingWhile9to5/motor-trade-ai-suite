import { z } from "zod";
import { factFindExtractionSchema } from "./extraction";

export const reviewStatusSchema = z.enum([
  "pending",
  "approved",
  "needs_changes",
]);

export const extractionReviewSchema = z
  .object({
    extraction_id: z.string().uuid(),
    reviewer_user_id: z.string().min(1),
    reviewed_output: factFindExtractionSchema.nullable(),
    review_status: reviewStatusSchema,
    reviewed_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export const createReviewInputSchema = extractionReviewSchema;

export const getReviewByExtractionIdInputSchema = z
  .object({
    extraction_id: z.string().uuid(),
  })
  .strict();

export const updateReviewInputSchema = z
  .object({
    extraction_id: z.string().uuid(),
    reviewer_user_id: z.string().min(1).optional(),
    reviewed_output: factFindExtractionSchema.nullable().optional(),
    review_status: reviewStatusSchema.optional(),
    reviewed_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.reviewer_user_id !== undefined ||
      input.reviewed_output !== undefined ||
      input.review_status !== undefined ||
      input.reviewed_at !== undefined,
    {
      message: "At least one review field must be provided for update.",
    },
  );

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ExtractionReview = z.infer<typeof extractionReviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type GetReviewByExtractionIdInput = z.infer<
  typeof getReviewByExtractionIdInputSchema
>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
