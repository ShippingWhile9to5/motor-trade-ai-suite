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

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ExtractionReview = z.infer<typeof extractionReviewSchema>;
