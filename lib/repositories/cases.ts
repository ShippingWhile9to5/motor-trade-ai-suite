import "server-only";

import {
  type Case,
  type CreateCaseInput,
  caseSchema,
  createCaseInputSchema,
  deleteCaseInputSchema,
  getCaseByIdInputSchema,
  listCasesForUserInputSchema,
  updateCaseInputSchema,
} from "../schemas/case";
import { supabase } from "../supabase";

const caseSelect = "id,user_id,client_name,status,created_at,updated_at";

type SupabaseError = {
  message: string;
};

type CaseInsert = CreateCaseInput & {
  owner_id?: string;
};

function parseCaseRow(row: unknown): Case {
  return caseSchema.parse(row);
}

function throwSupabaseError(error: SupabaseError | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function needsLegacyOwnerId(error: SupabaseError | null) {
  return Boolean(
    error?.message.includes("owner_id") &&
      error.message.includes("violates not-null constraint"),
  );
}

function insertCaseRow(data: CaseInsert) {
  return supabase.from("cases").insert(data).select(caseSelect).single();
}

export async function createCase(input: unknown): Promise<Case> {
  const data = createCaseInputSchema.parse(input);

  let { data: row, error } = await insertCaseRow(data);

  if (needsLegacyOwnerId(error)) {
    const retry = await insertCaseRow({
      ...data,
      owner_id: data.user_id,
    });

    row = retry.data;
    error = retry.error;
  }

  throwSupabaseError(error);

  return parseCaseRow(row);
}

export async function getCaseById(input: unknown): Promise<Case | null> {
  const data = getCaseByIdInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("cases")
    .select(caseSelect)
    .eq("id", data.id)
    .eq("user_id", data.user_id)
    .maybeSingle();

  throwSupabaseError(error);

  return row ? parseCaseRow(row) : null;
}

export async function listCasesForUser(input: unknown): Promise<Case[]> {
  const data = listCasesForUserInputSchema.parse(input);

  const { data: rows, error } = await supabase
    .from("cases")
    .select(caseSelect)
    .eq("user_id", data.user_id)
    .order("updated_at", { ascending: false });

  throwSupabaseError(error);

  return caseSchema.array().parse(rows ?? []);
}

export async function deleteCase(input: unknown): Promise<Case | null> {
  const data = deleteCaseInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("cases")
    .delete()
    .eq("id", data.id)
    .eq("user_id", data.user_id)
    .select(caseSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return row ? parseCaseRow(row) : null;
}

export async function updateCase(input: unknown): Promise<Case | null> {
  const data = updateCaseInputSchema.parse(input);
  const { id, user_id, ...updates } = data;

  const { data: row, error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user_id)
    .select(caseSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return row ? parseCaseRow(row) : null;
}
