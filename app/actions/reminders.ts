"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth";
import {
  createReminderWorkflow,
  deleteReminderWorkflow,
  updateReminderWorkflow,
} from "../../lib/services/reminders";
import type { Reminder } from "../../lib/schemas/reminder";

async function currentUserId(): Promise<string> {
  const { userId } = await requireUser();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

export type ReminderOutcome =
  | { ok: true; reminder: Reminder | null }
  | { ok: false; error: string };

function failed(error: unknown, fallback: string): ReminderOutcome {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function createReminderAction(
  input: unknown,
): Promise<ReminderOutcome> {
  const userId = await currentUserId();

  try {
    const reminder = await createReminderWorkflow(userId, input);

    revalidatePath("/");

    return { ok: true, reminder };
  } catch (error) {
    return failed(error, "Could not save the reminder.");
  }
}

export async function updateReminderAction(
  input: unknown,
): Promise<ReminderOutcome> {
  const userId = await currentUserId();

  try {
    const reminder = await updateReminderWorkflow(userId, input);

    revalidatePath("/");

    return { ok: true, reminder };
  } catch (error) {
    return failed(error, "Could not update the reminder.");
  }
}

export async function deleteReminderAction(
  input: unknown,
): Promise<ReminderOutcome> {
  const userId = await currentUserId();

  try {
    await deleteReminderWorkflow(userId, input);

    revalidatePath("/");

    return { ok: true, reminder: null };
  } catch (error) {
    return failed(error, "Could not delete the reminder.");
  }
}
