import "server-only";

import {
  type ExtractionRecord,
  createExtractionInputSchema,
  extractionRecordSchema,
  factFindExtractionSchema,
  getExtractionByCaseIdInputSchema,
  updateExtractionInputSchema,
} from "../schemas/extraction";
import { supabase } from "../supabase";

const extractionSelect =
  "id,case_id,document_id,user_id,status,raw_result_json,reviewed_result_json,error_message,created_at,updated_at";
const extractionWithoutDocumentSelect =
  "id,case_id,user_id,status,raw_result_json,reviewed_result_json,error_message,created_at,updated_at";
const extractionMinimalSelect =
  "id,case_id,user_id,status,raw_result_json,created_at,updated_at";
const legacyDataExtractionSelect =
  "id,case_id,user_id,status,data,created_at,updated_at";

const extractionReadCandidates = [
  extractionSelect,
  extractionWithoutDocumentSelect,
  extractionMinimalSelect,
  legacyDataExtractionSelect,
];

type ExtractionRow = {
  id: string;
  case_id: string;
  document_id?: string;
  user_id: string;
  status: ExtractionRecord["status"];
  data?: ExtractionRecord["raw_result_json"];
  raw_result_json?: ExtractionRecord["raw_result_json"];
  reviewed_result_json?: ExtractionRecord["reviewed_result_json"];
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

function parseExtractionRow(
  row: ExtractionRow,
  fallbackDocumentId?: string,
): ExtractionRecord {
  const {
    id,
    case_id,
    document_id,
    user_id,
    status,
    raw_result_json,
    data,
    reviewed_result_json,
    error_message,
    created_at,
    updated_at,
  } = row;
  const parsedRawResult = factFindExtractionSchema.safeParse(
    raw_result_json ?? data ?? null,
  );
  const parsedReviewedResult = factFindExtractionSchema.safeParse(
    reviewed_result_json ?? null,
  );

  return extractionRecordSchema.parse({
    id,
    case_id,
    document_id: document_id ?? fallbackDocumentId ?? id,
    user_id,
    status,
    raw_result_json: parsedRawResult.success ? parsedRawResult.data : null,
    reviewed_result_json: parsedReviewedResult.success
      ? parsedReviewedResult.data
      : null,
    error_message: error_message ?? null,
    created_at,
    updated_at,
  });
}

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function isMissingExtractionColumn(error: { message: string } | null) {
  return Boolean(
    error?.message.includes("'document_id' column") ||
      error?.message.includes("'raw_result_json' column") ||
      error?.message.includes("'reviewed_result_json' column") ||
      error?.message.includes("'error_message' column"),
  );
}

function needsLegacyDataColumn(error: { message: string } | null) {
  return Boolean(
    error?.message.includes('null value in column "data"') ||
      error?.message.includes("'data' column"),
  );
}

export async function createExtraction(
  input: unknown,
): Promise<ExtractionRecord> {
  const data = createExtractionInputSchema.parse(input);

  let { data: row, error } = await supabase
    .from("extractions")
    .insert({
      ...data,
      raw_result_json: data.raw_result_json ?? null,
      reviewed_result_json: data.reviewed_result_json ?? null,
      error_message: data.error_message ?? null,
    })
    .select(extractionSelect)
    .single<ExtractionRow>();

  if (isMissingExtractionColumn(error)) {
    const retry = await supabase
      .from("extractions")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        status: data.status,
        raw_result_json: data.raw_result_json ?? null,
        reviewed_result_json: data.reviewed_result_json ?? null,
        error_message: data.error_message ?? null,
      })
      .select(extractionWithoutDocumentSelect)
      .single<ExtractionRow>();

    row = retry.data;
    error = retry.error;
  }

  if (isMissingExtractionColumn(error)) {
    const retry = await supabase
      .from("extractions")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        status: data.status,
        raw_result_json: data.raw_result_json ?? null,
      })
      .select(extractionMinimalSelect)
      .single<ExtractionRow>();

    row = retry.data;
    error = retry.error;
  }

  if (needsLegacyDataColumn(error)) {
    const retry = await supabase
      .from("extractions")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        status: data.status,
        raw_result_json: data.raw_result_json ?? null,
        data: data.raw_result_json ?? null,
      })
      .select(legacyDataExtractionSelect)
      .single<ExtractionRow>();

    row = retry.data;
    error = retry.error;
  }

  throwSupabaseError(error);

  return parseExtractionRow(row as ExtractionRow, data.document_id);
}

export async function getExtractionByCaseId(
  input: unknown,
): Promise<ExtractionRecord | null> {
  const data = getExtractionByCaseIdInputSchema.parse(input);
  let lastError: { message: string } | null = null;
  let fallbackExtraction: ExtractionRecord | null = null;

  for (const selectShape of extractionReadCandidates) {
    const { data: rows, error } = await supabase
      .from("extractions")
      .select(selectShape)
      .eq("case_id", data.case_id)
      .eq("user_id", data.user_id)
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<ExtractionRow[]>();

    if (error) {
      lastError = error;

      if (isMissingExtractionColumn(error)) {
        continue;
      }

      throwSupabaseError(error);
    }

    if (!rows || rows.length === 0) {
      continue;
    }

    for (const row of rows) {
      const extraction = parseExtractionRow(row);

      if (!fallbackExtraction) {
        fallbackExtraction = extraction;
      }

      if (!extraction.raw_result_json && selectShape !== legacyDataExtractionSelect) {
        continue;
      }

      return extraction;
    }
  }

  throwSupabaseError(lastError);

  return fallbackExtraction;
}

export async function updateExtraction(
  input: unknown,
): Promise<ExtractionRecord | null> {
  const data = updateExtractionInputSchema.parse(input);
  const { id, user_id, ...updates } = data;
  let lastError: { message: string } | null = null;

  for (const selectShape of extractionReadCandidates) {
    const { data: row, error } = await supabase
      .from("extractions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user_id)
      .select(selectShape)
      .maybeSingle<ExtractionRow>();

    if (error) {
      lastError = error;

      if (isMissingExtractionColumn(error)) {
        continue;
      }

      throwSupabaseError(error);
    }

    return row ? parseExtractionRow(row) : null;
  }

  throwSupabaseError(lastError);

  return null;
}
