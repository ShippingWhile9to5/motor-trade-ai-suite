import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase, store } from "./helpers/fake-supabase";

installFakeSupabase();

function isExtractionFieldShape(value: unknown): value is { value: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "confidence" in value &&
    "is_missing_required" in value
  );
}

function fillAllFields(value: unknown): void {
  if (isExtractionFieldShape(value)) {
    value.value = "Reviewer provided value";
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(fillAllFields);
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach(fillAllFields);
  }
}

test("review approval is rejected while required fields are missing", async () => {
  const { createPlaceholderFactFindExtraction } = require(
    "../../lib/providers/fact-find-provider",
  ) as typeof import(
    "../../lib/providers/fact-find-provider"
  );
  const { createReviewWorkflow } = require(
    "../../lib/services/reviews",
  ) as typeof import("../../lib/services/reviews");

  await assert.rejects(
    createReviewWorkflow({
      extraction_id: crypto.randomUUID(),
      reviewer_user_id: "user_test_123",
      reviewed_output: createPlaceholderFactFindExtraction(),
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
    }),
    /required fields are missing/,
  );
});

test("placeholder submission pipeline runs through persistence", async () => {
  const { createPlaceholderFactFindExtraction } = require(
    "../../lib/providers/fact-find-provider",
  ) as typeof import(
    "../../lib/providers/fact-find-provider"
  );
  const {
    factFindSubmissionProvider,
    placeholderSubmissionText,
  } = require(
    "../../lib/providers/fact-find-submission-provider",
  ) as typeof import(
    "../../lib/providers/fact-find-submission-provider"
  );
  const { generateSubmissionFromApprovedReview } = require(
    "../../lib/services/submission-orchestrator",
  ) as typeof import(
    "../../lib/services/submission-orchestrator"
  );
  const { createReviewWorkflow } = require(
    "../../lib/services/reviews",
  ) as typeof import("../../lib/services/reviews");
  const { getSubmissionByCaseIdWorkflow } = require(
    "../../lib/services/submissions",
  ) as typeof import("../../lib/services/submissions");

  const caseId = crypto.randomUUID();
  const extractionId = crypto.randomUUID();
  const reviewedOutput = createPlaceholderFactFindExtraction();
  fillAllFields(reviewedOutput);

  // The reviews repository looks up the extraction's case_id when creating
  // a review row, mirroring the real foreign-key relationship.
  store.extractions = [{ id: extractionId, case_id: caseId }];

  await createReviewWorkflow({
    extraction_id: extractionId,
    reviewer_user_id: "user_test_123",
    reviewed_output: reviewedOutput,
    review_status: "approved",
    reviewed_at: new Date().toISOString(),
  });

  const result = await generateSubmissionFromApprovedReview(
    {
      case_id: caseId,
      extraction_id: extractionId,
    },
    factFindSubmissionProvider,
  );

  assert.equal(result.success, true);

  if (!result.success) {
    throw new Error("Expected submission generation to succeed.");
  }

  assert.equal(result.review.extraction_id, extractionId);
  assert.equal(result.review.review_status, "approved");
  assert.equal(result.submission.case_id, caseId);
  assert.equal(result.submission.review_id, extractionId);
  assert.equal(result.submission.submission_text, placeholderSubmissionText);
  assert.equal(result.submission.submission_status, "draft");

  const persisted = await getSubmissionByCaseIdWorkflow({
    case_id: caseId,
  });

  assert.deepEqual(persisted, result.submission);
});
