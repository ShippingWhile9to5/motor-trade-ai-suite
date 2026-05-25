import "server-only";

import { z } from "zod";
import type { SubmissionProvider } from "../providers/submission";
import { getReviewByExtractionIdWorkflow } from "./reviews";
import { createSubmissionWorkflow } from "./submissions";

export const createSubmissionFromApprovedReviewInputSchema = z
  .object({
    case_id: z.string().uuid(),
    extraction_id: z.string().uuid(),
    submission_text: z.string(),
  })
  .strict();

export const generateSubmissionFromApprovedReviewInputSchema = z
  .object({
    case_id: z.string().uuid(),
    extraction_id: z.string().uuid(),
  })
  .strict();

export async function createSubmissionFromApprovedReview(input: unknown) {
  const data = createSubmissionFromApprovedReviewInputSchema.parse(input);
  const review = await getReviewByExtractionIdWorkflow({
    extraction_id: data.extraction_id,
  });

  if (!review) {
    return {
      success: false as const,
      error: "Approved review not found.",
    };
  }

  if (review.review_status !== "approved") {
    return {
      success: false as const,
      error: "Review is not approved.",
    };
  }

  const submission = await createSubmissionWorkflow({
    case_id: data.case_id,
    review_id: review.extraction_id,
    submission_text: data.submission_text,
    submission_status: "draft",
  });

  return {
    success: true as const,
    review,
    submission,
  };
}

export async function generateSubmissionFromApprovedReview(
  input: unknown,
  provider: SubmissionProvider,
) {
  const data = generateSubmissionFromApprovedReviewInputSchema.parse(input);
  const review = await getReviewByExtractionIdWorkflow({
    extraction_id: data.extraction_id,
  });

  if (!review) {
    return {
      success: false as const,
      error: "Approved review not found.",
    };
  }

  if (review.review_status !== "approved") {
    return {
      success: false as const,
      error: "Review is not approved.",
    };
  }

  const submissionText = await provider.generate(review);
  const submission = await createSubmissionWorkflow({
    case_id: data.case_id,
    review_id: review.extraction_id,
    submission_text: submissionText,
    submission_status: "draft",
  });

  return {
    success: true as const,
    review,
    submission,
  };
}
