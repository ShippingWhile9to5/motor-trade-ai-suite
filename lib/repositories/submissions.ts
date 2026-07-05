import "server-only";

import {
  type CreateSubmissionInput,
  type SaveSubmissionComposerStateInput,
  type Submission,
  createSubmissionInputSchema,
  getSubmissionByCaseIdInputSchema,
  saveSubmissionComposerStateInputSchema,
  submissionSchema,
  updateSubmissionInputSchema,
} from "../schemas/submission";
import { supabase } from "../supabase";

const submissionSelect =
  "case_id,review_id,submission_text,status,composer_input_json,motor_trade_additional_information,material_damage_additional_information,underwriter_email,created_at";

type SupabaseError = {
  message: string;
};

type SubmissionRow = {
  case_id: string;
  review_id: string | null;
  submission_text: string | null;
  status: string;
  composer_input_json: unknown;
  motor_trade_additional_information: string | null;
  material_damage_additional_information: string | null;
  underwriter_email: string | null;
  created_at: string;
};

function parseSubmissionRow(row: SubmissionRow): Submission {
  return submissionSchema.parse({
    case_id: row.case_id,
    review_id: row.review_id,
    submission_text: row.submission_text ?? "",
    submission_status: row.status,
    composer_input: row.composer_input_json,
    motor_trade_additional_information: row.motor_trade_additional_information,
    material_damage_additional_information:
      row.material_damage_additional_information,
    underwriter_email: row.underwriter_email,
    created_at: row.created_at,
  });
}

function throwSupabaseError(error: SupabaseError | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function toInsertRow(data: CreateSubmissionInput) {
  return {
    case_id: data.case_id,
    review_id: data.review_id,
    submission_text: data.submission_text,
    status: data.submission_status,
    composer_input_json: data.composer_input,
    motor_trade_additional_information: data.motor_trade_additional_information,
    material_damage_additional_information:
      data.material_damage_additional_information,
    underwriter_email: data.underwriter_email,
  };
}

export async function createSubmission(input: unknown): Promise<Submission> {
  const data = createSubmissionInputSchema.parse(input);

  // One row per case: an existing row (e.g. saved composer state before a
  // draft was ever generated) is updated in place rather than duplicated.
  const { data: existing } = await supabase
    .from("submission_outputs")
    .select("case_id")
    .eq("case_id", data.case_id)
    .maybeSingle<{ case_id: string }>();

  const { data: row, error } = existing
    ? await supabase
        .from("submission_outputs")
        .update(toInsertRow(data))
        .eq("case_id", data.case_id)
        .select(submissionSelect)
        .single<SubmissionRow>()
    : await supabase
        .from("submission_outputs")
        .insert({ user_id: "system", ...toInsertRow(data) })
        .select(submissionSelect)
        .single<SubmissionRow>();

  throwSupabaseError(error);

  if (!row) {
    throw new Error("Submission was not returned after creation.");
  }

  return parseSubmissionRow(row);
}

export async function getSubmissionByCaseId(
  input: unknown,
): Promise<Submission | null> {
  const { case_id } = getSubmissionByCaseIdInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("submission_outputs")
    .select(submissionSelect)
    .eq("case_id", case_id)
    .maybeSingle<SubmissionRow>();

  throwSupabaseError(error);

  return row ? parseSubmissionRow(row) : null;
}

export async function saveComposerState(
  input: unknown,
): Promise<Submission> {
  const data: SaveSubmissionComposerStateInput =
    saveSubmissionComposerStateInputSchema.parse(input);

  const { data: existing } = await supabase
    .from("submission_outputs")
    .select("case_id")
    .eq("case_id", data.case_id)
    .maybeSingle<{ case_id: string }>();

  const composerFields = {
    review_id: data.review_id,
    composer_input_json: data.composer_input,
    motor_trade_additional_information: data.motor_trade_additional_information,
    material_damage_additional_information:
      data.material_damage_additional_information,
    underwriter_email: data.underwriter_email,
  };

  const { data: row, error } = existing
    ? await supabase
        .from("submission_outputs")
        .update(composerFields)
        .eq("case_id", data.case_id)
        .select(submissionSelect)
        .single<SubmissionRow>()
    : await supabase
        .from("submission_outputs")
        .insert({ user_id: "system", case_id: data.case_id, ...composerFields })
        .select(submissionSelect)
        .single<SubmissionRow>();

  throwSupabaseError(error);

  if (!row) {
    throw new Error("Submission composer state was not returned after saving.");
  }

  return parseSubmissionRow(row);
}

export async function updateSubmission(
  input: unknown,
): Promise<Submission | null> {
  const data = updateSubmissionInputSchema.parse(input);
  const { case_id, submission_status, composer_input, ...rest } = data;

  const { data: row, error } = await supabase
    .from("submission_outputs")
    .update({
      ...rest,
      ...(submission_status !== undefined ? { status: submission_status } : {}),
      ...(composer_input !== undefined
        ? { composer_input_json: composer_input }
        : {}),
    })
    .eq("case_id", case_id)
    .select(submissionSelect)
    .maybeSingle<SubmissionRow>();

  throwSupabaseError(error);

  return row ? parseSubmissionRow(row) : null;
}
