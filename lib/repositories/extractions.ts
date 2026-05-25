import "server-only";

import {
  type ExtractionRecord,
  createExtractionInputSchema,
  extractionRecordSchema,
  getExtractionByCaseIdInputSchema,
  updateExtractionInputSchema,
} from "../schemas/extraction";
import { supabase } from "../supabase";

const extractionSelect =
  "id,case_id,document_id,user_id,status,raw_result_json,reviewed_result_json,error_message,created_at,updated_at";

function parseExtractionRow(row: unknown): ExtractionRecord {
  return extractionRecordSchema.parse(row);
}

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function createExtraction(
  input: unknown,
): Promise<ExtractionRecord> {
  const data = createExtractionInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("extractions")
    .insert({
      ...data,
      raw_result_json: data.raw_result_json ?? null,
      reviewed_result_json: data.reviewed_result_json ?? null,
      error_message: data.error_message ?? null,
    })
    .select(extractionSelect)
    .single();

  throwSupabaseError(error);

  return parseExtractionRow(row);
}

export async function getExtractionByCaseId(
  input: unknown,
): Promise<ExtractionRecord | null> {
  const data = getExtractionByCaseIdInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("extractions")
    .select(extractionSelect)
    .eq("case_id", data.case_id)
    .eq("user_id", data.user_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwSupabaseError(error);

  return row ? parseExtractionRow(row) : null;
}

export async function updateExtraction(
  input: unknown,
): Promise<ExtractionRecord | null> {
  const data = updateExtractionInputSchema.parse(input);
  const { id, user_id, ...updates } = data;

  const { data: row, error } = await supabase
    .from("extractions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user_id)
    .select(extractionSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return row ? parseExtractionRow(row) : null;
}
