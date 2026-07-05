import "server-only";

import {
  type ExtractionReview,
  createReviewInputSchema,
  extractionReviewSchema,
  getReviewByExtractionIdInputSchema,
  updateReviewInputSchema,
} from "../schemas/review";
import { supabase } from "../supabase";

const reviewSelect =
  "extraction_id,user_id,review_status,reviewed_output,reviewed_at";

type SupabaseError = {
  message: string;
};

type ReviewRow = {
  extraction_id: string;
  user_id: string;
  review_status: string;
  reviewed_output: unknown;
  reviewed_at: string | null;
};

function parseReviewRow(row: ReviewRow): ExtractionReview {
  return extractionReviewSchema.parse({
    extraction_id: row.extraction_id,
    reviewer_user_id: row.user_id,
    reviewed_output: row.reviewed_output,
    review_status: row.review_status,
    reviewed_at: row.reviewed_at,
  });
}

function throwSupabaseError(error: SupabaseError | null) {
  if (error) {
    throw new Error(error.message);
  }
}

async function getExtractionCaseId(extractionId: string): Promise<string> {
  const { data, error } = await supabase
    .from("extractions")
    .select("case_id")
    .eq("id", extractionId)
    .single<{ case_id: string }>();

  throwSupabaseError(error);

  if (!data) {
    throw new Error("Extraction not found for review.");
  }

  return data.case_id;
}

export async function createReview(input: unknown): Promise<ExtractionReview> {
  const data = createReviewInputSchema.parse(input);
  const caseId = await getExtractionCaseId(data.extraction_id);

  const { data: row, error } = await supabase
    .from("reviews")
    .insert({
      extraction_id: data.extraction_id,
      case_id: caseId,
      user_id: data.reviewer_user_id,
      review_status: data.review_status,
      reviewed_output: data.reviewed_output,
      reviewed_at: data.reviewed_at,
    })
    .select(reviewSelect)
    .single<ReviewRow>();

  throwSupabaseError(error);

  if (!row) {
    throw new Error("Review was not returned after creation.");
  }

  return parseReviewRow(row);
}

export async function getReviewByExtractionId(
  input: unknown,
): Promise<ExtractionReview | null> {
  const { extraction_id } = getReviewByExtractionIdInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("reviews")
    .select(reviewSelect)
    .eq("extraction_id", extraction_id)
    .maybeSingle<ReviewRow>();

  throwSupabaseError(error);

  return row ? parseReviewRow(row) : null;
}

export async function updateReview(
  input: unknown,
): Promise<ExtractionReview | null> {
  const data = updateReviewInputSchema.parse(input);
  const { extraction_id, reviewer_user_id, ...rest } = data;

  const { data: row, error } = await supabase
    .from("reviews")
    .update({
      ...(reviewer_user_id !== undefined ? { user_id: reviewer_user_id } : {}),
      ...rest,
    })
    .eq("extraction_id", extraction_id)
    .select(reviewSelect)
    .maybeSingle<ReviewRow>();

  throwSupabaseError(error);

  return row ? parseReviewRow(row) : null;
}
