import "server-only";

import {
  type Case,
  caseSchema,
  createCaseInputSchema,
  getCaseByIdInputSchema,
  listCasesForUserInputSchema,
  updateCaseInputSchema,
} from "../schemas/case";
import { supabase } from "../supabase";

const caseSelect = "id,user_id,client_name,status,created_at,updated_at";

function parseCaseRow(row: unknown): Case {
  return caseSchema.parse(row);
}

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function createCase(input: unknown): Promise<Case> {
  const data = createCaseInputSchema.parse(input);

  const { data: row, error } = await supabase
    .from("cases")
    .insert(data)
    .select(caseSelect)
    .single();

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
