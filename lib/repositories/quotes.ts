import "server-only";

import { type Quote, quoteSchema } from "../schemas/quote";
import { supabase } from "../supabase";

const quoteSelect = "*";

type SupabaseError = { message: string } | null;

function throwSupabaseError(error: SupabaseError) {
  if (error) {
    throw new Error(error.message);
  }
}

function parseRow(row: unknown): Quote {
  return quoteSchema.parse(row);
}

export async function listQuotes(userId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quote")
    .select(quoteSelect)
    .eq("user_id", userId);

  throwSupabaseError(error);

  return (data ?? []).map(parseRow);
}

export async function getQuoteById(
  userId: string,
  id: string,
): Promise<Quote | null> {
  const { data, error } = await supabase
    .from("quote")
    .select(quoteSelect)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export type InsertQuoteRow = {
  business_id: string;
  insurer: string;
  quote_type: string;
  submission_date: string;
  stage: number;
  notes: string | null;
  target_premium: number | null;
  last_year_premium: number | null;
  quoted_premium: number | null;
  initial_quoted_premium: number | null;
};

export async function insertQuote(
  userId: string,
  row: InsertQuoteRow,
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quote")
    .insert({ user_id: userId, ...row })
    .select(quoteSelect)
    .single();

  throwSupabaseError(error);

  if (!data) {
    throw new Error("Quote was not returned after creation.");
  }

  return parseRow(data);
}

export async function updateQuoteRow(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Quote | null> {
  const { data, error } = await supabase
    .from("quote")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(quoteSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export async function deleteQuote(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("quote")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  throwSupabaseError(error);
}
