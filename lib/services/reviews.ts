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
import { getGroupedMissingExtractionFields } from "../validation/extraction";

function assertApprovableReview(data: {
  review_status?: string;
  reviewed_output?: unknown;
}) {
  if (data.review_status !== "approved") {
    return;
  }

  const validation = getGroupedMissingExtractionFields(data.reviewed_output);

  if (validation.success && validation.missing_required_fields.length > 0) {
    throw new Error(
      "Review cannot be approved while required fields are missing values.",
    );
  }
}

export async function createReviewWorkflow(input: unknown) {
  const data = createReviewInputSchema.parse(input);

  assertApprovableReview(data);

  return createReview(data);
}

export async function getReviewByExtractionIdWorkflow(input: unknown) {
  const data = getReviewByExtractionIdInputSchema.parse(input);

  return getReviewByExtractionId(data);
}

export async function updateReviewWorkflow(input: unknown) {
  const data = updateReviewInputSchema.parse(input);

  assertApprovableReview(data);

  return updateReview(data);
}
