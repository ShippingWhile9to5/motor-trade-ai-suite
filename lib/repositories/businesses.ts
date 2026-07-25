import "server-only";

import {
  type Business,
  type CreateBusinessInput,
  businessSchema,
} from "../schemas/business";
import { supabase } from "../supabase";

const businessSelect = "*";

type SupabaseError = { message: string } | null;

function throwSupabaseError(error: SupabaseError) {
  if (error) {
    throw new Error(error.message);
  }
}

function parseRow(row: unknown): Business {
  return businessSchema.parse(row);
}

export async function listBusinesses(userId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from("business")
    .select(businessSelect)
    .eq("user_id", userId);

  throwSupabaseError(error);

  return (data ?? []).map(parseRow);
}

export async function getBusinessById(
  userId: string,
  id: string,
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .select(businessSelect)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

// Case-insensitive exact match on the business name, scoped to the user. Used
// to reuse an existing business when a quote is created by typing a client
// name rather than picking a saved record.
export async function findBusinessByName(
  userId: string,
  name: string,
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .select(businessSelect)
    .eq("user_id", userId)
    .ilike("name", name.trim())
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export async function findBusinessByCompanyNumber(
  userId: string,
  companyNumber: string,
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .select(businessSelect)
    .eq("user_id", userId)
    .eq("company_number", companyNumber)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<Business> {
  const { data, error } = await supabase
    .from("business")
    .insert({ user_id: userId, ...input })
    .select(businessSelect)
    .single();

  throwSupabaseError(error);

  if (!data) {
    throw new Error("Business was not returned after creation.");
  }

  return parseRow(data);
}

export async function updateBusiness(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(businessSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export async function deleteBusiness(
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("business")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  throwSupabaseError(error);
}

export async function updateBusinessPipelineStatus(
  userId: string,
  id: string,
  pipelineStatus: Business["pipeline_status"],
): Promise<void> {
  const { error } = await supabase
    .from("business")
    .update({ pipeline_status: pipelineStatus })
    .eq("user_id", userId)
    .eq("id", id);

  throwSupabaseError(error);
}
