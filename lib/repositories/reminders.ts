import "server-only";

import { type Reminder, reminderSchema } from "../schemas/reminder";
import { supabase } from "../supabase";

const reminderSelect = "*";

type SupabaseError = { message: string } | null;

function throwSupabaseError(error: SupabaseError) {
  if (error) {
    throw new Error(error.message);
  }
}

function parseRow(row: unknown): Reminder {
  return reminderSchema.parse(row);
}

export async function listReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminder")
    .select(reminderSelect)
    .eq("user_id", userId);

  throwSupabaseError(error);

  return (data ?? []).map(parseRow);
}

export type InsertReminderRow = {
  business_id: string | null;
  body: string;
  due_date: string;
};

export async function insertReminder(
  userId: string,
  row: InsertReminderRow,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminder")
    .insert({ user_id: userId, ...row })
    .select(reminderSelect)
    .single();

  throwSupabaseError(error);

  if (!data) {
    throw new Error("Reminder was not returned after creation.");
  }

  return parseRow(data);
}

export async function updateReminderRow(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from("reminder")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(reminderSelect)
    .maybeSingle();

  throwSupabaseError(error);

  return data ? parseRow(data) : null;
}

export async function deleteReminder(
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("reminder")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  throwSupabaseError(error);
}
