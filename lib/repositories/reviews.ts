import "server-only";

import {
  type ExtractionReview,
  createReviewInputSchema,
  extractionReviewSchema,
  getReviewByExtractionIdInputSchema,
  updateReviewInputSchema,
} from "../schemas/review";

const reviews = new Map<string, ExtractionReview>();

export async function createReview(input: unknown): Promise<ExtractionReview> {
  const data = createReviewInputSchema.parse(input);
  const review = extractionReviewSchema.parse(data);

  reviews.set(review.extraction_id, review);

  return review;
}

export async function getReviewByExtractionId(
  input: unknown,
): Promise<ExtractionReview | null> {
  const { extraction_id } = getReviewByExtractionIdInputSchema.parse(input);

  return reviews.get(extraction_id) ?? null;
}

export async function updateReview(
  input: unknown,
): Promise<ExtractionReview | null> {
  const data = updateReviewInputSchema.parse(input);
  const { extraction_id, ...updates } = data;
  const existingReview = reviews.get(extraction_id);

  if (!existingReview) {
    return null;
  }

  const review = extractionReviewSchema.parse({
    ...existingReview,
    ...updates,
  });

  reviews.set(extraction_id, review);

  return review;
}
