import "server-only";

import {
  createReview,
  getReviewByExtractionId,
  updateReview,
} from "../repositories/reviews";
import {
  createReviewInputSchema,
  getReviewByExtractionIdInputSchema,
  updateReviewInputSchema,
} from "../schemas/review";

export async function createReviewWorkflow(input: unknown) {
  const data = createReviewInputSchema.parse(input);

  return createReview(data);
}

export async function getReviewByExtractionIdWorkflow(input: unknown) {
  const data = getReviewByExtractionIdInputSchema.parse(input);

  return getReviewByExtractionId(data);
}

export async function updateReviewWorkflow(input: unknown) {
  const data = updateReviewInputSchema.parse(input);

  return updateReview(data);
}
