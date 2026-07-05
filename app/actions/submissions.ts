"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { factFindSubmissionProvider } from "../../lib/providers/fact-find-submission-provider";
import { submissionComposerInputSchema } from "../../lib/schemas/submission-composer";
import { submissionStatusSchema } from "../../lib/schemas/submission";
import { getCaseWorkflow } from "../../lib/services/cases";
import { getExtractionByCaseIdWorkflow } from "../../lib/services/extractions";
import { getReviewByExtractionIdWorkflow } from "../../lib/services/reviews";
import { generateSubmissionFromApprovedReview } from "../../lib/services/submission-orchestrator";
import {
  getSubmissionByCaseIdWorkflow,
  saveSubmissionComposerStateWorkflow,
  updateSubmissionWorkflow,
} from "../../lib/services/submissions";

const ownedReviewInputSchema = z
  .object({
    case_id: z.string().uuid(),
    extraction_id: z.string().uuid(),
  })
  .strict();

const createSubmissionActionInputSchema = ownedReviewInputSchema;

const updateSubmissionActionInputSchema = ownedReviewInputSchema
  .extend({
    submission_text: z.string().optional(),
    submission_status: submissionStatusSchema.optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.submission_text !== undefined ||
      input.submission_status !== undefined,
    {
      message: "At least one submission field must be provided for update.",
    },
  );

const getSubmissionActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

async function getOwnedApprovedReview(input: unknown, userId: string) {
  const candidate =
    input && typeof input === "object"
      ? {
          case_id: (input as Record<string, unknown>).case_id,
          extraction_id: (input as Record<string, unknown>).extraction_id,
        }
      : input;
  const data = ownedReviewInputSchema.parse(candidate);
  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: userId,
  });

  if (!userCase) {
    return null;
  }

  const extraction = await getExtractionByCaseIdWorkflow({
    case_id: userCase.id,
    user_id: userId,
  });

  if (!extraction || extraction.id !== data.extraction_id) {
    return null;
  }

  const review = await getReviewByExtractionIdWorkflow({
    extraction_id: extraction.id,
  });

  if (!review || review.review_status !== "approved") {
    return null;
  }

  return {
    case_id: userCase.id,
    extraction_id: extraction.id,
  };
}

export async function createSubmissionAction(input: unknown) {
  const user = await requireUser();
  const data = createSubmissionActionInputSchema.parse(input);
  const ownedReview = await getOwnedApprovedReview(data, user.userId);

  if (!ownedReview) {
    return {
      success: false as const,
      error: "Approved review not found.",
    };
  }

  return generateSubmissionFromApprovedReview(
    {
      case_id: ownedReview.case_id,
      extraction_id: ownedReview.extraction_id,
    },
    factFindSubmissionProvider,
  );
}

export async function updateSubmissionAction(input: unknown) {
  const user = await requireUser();
  const data = updateSubmissionActionInputSchema.parse(input);
  const ownedReview = await getOwnedApprovedReview(data, user.userId);

  if (!ownedReview) {
    return null;
  }

  return updateSubmissionWorkflow({
    case_id: ownedReview.case_id,
    review_id: ownedReview.extraction_id,
    ...(data.submission_text !== undefined
      ? { submission_text: data.submission_text }
      : {}),
    ...(data.submission_status !== undefined
      ? { submission_status: data.submission_status }
      : {}),
  });
}

const saveSubmissionComposerStateActionInputSchema = ownedReviewInputSchema.extend({
  composer_input: submissionComposerInputSchema,
  motor_trade_additional_information: z.string(),
  material_damage_additional_information: z.string(),
  underwriter_email: z.string(),
});

export async function saveSubmissionComposerStateAction(input: unknown) {
  const user = await requireUser();
  const data = saveSubmissionComposerStateActionInputSchema.parse(input);
  const ownedReview = await getOwnedApprovedReview(data, user.userId);

  if (!ownedReview) {
    return {
      success: false as const,
      error: "Approved review not found.",
    };
  }

  const submission = await saveSubmissionComposerStateWorkflow({
    case_id: ownedReview.case_id,
    review_id: ownedReview.extraction_id,
    composer_input: data.composer_input,
    motor_trade_additional_information: data.motor_trade_additional_information,
    material_damage_additional_information:
      data.material_damage_additional_information,
    underwriter_email: data.underwriter_email,
  });

  return {
    success: true as const,
    submission,
  };
}

export async function getSubmissionAction(input: unknown) {
  const user = await requireUser();
  const data = getSubmissionActionInputSchema.parse(input);
  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return null;
  }

  return getSubmissionByCaseIdWorkflow({
    case_id: userCase.id,
  });
}
