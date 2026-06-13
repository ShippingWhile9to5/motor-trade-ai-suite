"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import {
  factFindExtractionSchema,
  type ExtractionRecord,
} from "../../lib/schemas/extraction";
import { reviewStatusSchema } from "../../lib/schemas/review";
import { getExtractionByCaseIdWorkflow } from "../../lib/services/extractions";
import { updateExtractionWorkflow } from "../../lib/services/extractions";
import {
  createReviewWorkflow,
  getReviewByExtractionIdWorkflow,
  updateReviewWorkflow,
} from "../../lib/services/reviews";

const reviewOwnershipInputSchema = z
  .object({
    case_id: z.string().uuid(),
    extraction_id: z.string().uuid(),
  })
  .strict();

const createReviewActionInputSchema = reviewOwnershipInputSchema
  .extend({
    reviewed_output: factFindExtractionSchema.nullable(),
    review_status: reviewStatusSchema,
    reviewed_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();

const updateReviewActionInputSchema = reviewOwnershipInputSchema
  .extend({
    reviewed_output: factFindExtractionSchema.nullable().optional(),
    review_status: reviewStatusSchema.optional(),
    reviewed_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.reviewed_output !== undefined ||
      input.review_status !== undefined ||
      input.reviewed_at !== undefined,
    {
      message: "At least one review field must be provided for update.",
    },
  );

const getReviewActionInputSchema = reviewOwnershipInputSchema;

async function getOwnedExtraction(
  input: unknown,
  userId: string,
): Promise<ExtractionRecord | null> {
  const candidate =
    input && typeof input === "object"
      ? {
          case_id: (input as Record<string, unknown>).case_id,
          extraction_id: (input as Record<string, unknown>).extraction_id,
        }
      : input;
  const data = reviewOwnershipInputSchema.parse(candidate);
  const extraction = await getExtractionByCaseIdWorkflow({
    case_id: data.case_id,
    user_id: userId,
  });

  if (!extraction || extraction.id !== data.extraction_id) {
    return null;
  }

  return extraction;
}

export async function createReviewAction(input: unknown) {
  const user = await requireUser();
  const data = createReviewActionInputSchema.parse(input);
  const extraction = await getOwnedExtraction(data, user.userId);

  if (!extraction) {
    return null;
  }

  const review = await createReviewWorkflow({
    extraction_id: extraction.id,
    reviewer_user_id: user.userId,
    reviewed_output: data.reviewed_output,
    review_status: data.review_status,
    reviewed_at: data.reviewed_at ?? null,
  });

  await updateExtractionWorkflow({
    id: extraction.id,
    user_id: user.userId,
    status: data.review_status === "approved" ? "approved" : "review_required",
    reviewed_result_json:
      data.review_status === "approved" ? data.reviewed_output : null,
  });

  return review;
}

export async function updateReviewAction(input: unknown) {
  const user = await requireUser();
  const data = updateReviewActionInputSchema.parse(input);
  const extraction = await getOwnedExtraction(data, user.userId);

  if (!extraction) {
    return null;
  }

  const review = await updateReviewWorkflow({
    extraction_id: extraction.id,
    reviewer_user_id: user.userId,
    ...(data.reviewed_output !== undefined
      ? { reviewed_output: data.reviewed_output }
      : {}),
    ...(data.review_status !== undefined ? { review_status: data.review_status } : {}),
    ...(data.reviewed_at !== undefined ? { reviewed_at: data.reviewed_at } : {}),
  });

  if (!review) {
    return null;
  }

  await updateExtractionWorkflow({
    id: extraction.id,
    user_id: user.userId,
    ...(data.review_status !== undefined
      ? {
          status:
            data.review_status === "approved" ? "approved" : "review_required",
        }
      : {}),
    ...(data.review_status !== undefined && data.review_status !== "approved"
      ? { reviewed_result_json: null }
      : data.reviewed_output !== undefined
      ? {
          reviewed_result_json:
            data.review_status === "approved" ||
            (data.review_status === undefined &&
              review.review_status === "approved")
              ? data.reviewed_output
              : null,
        }
      : {}),
  });

  return review;
}

export async function getReviewAction(input: unknown) {
  const user = await requireUser();
  const data = getReviewActionInputSchema.parse(input);
  const extraction = await getOwnedExtraction(data, user.userId);

  if (!extraction) {
    return null;
  }

  const review = await getReviewByExtractionIdWorkflow({
    extraction_id: extraction.id,
  });

  if (review) {
    return review;
  }

  if (extraction.status === "approved" && extraction.reviewed_result_json) {
    return {
      extraction_id: extraction.id,
      reviewer_user_id: user.userId,
      reviewed_output: extraction.reviewed_result_json,
      review_status: "approved" as const,
      reviewed_at: extraction.updated_at,
    };
  }

  return null;
}
