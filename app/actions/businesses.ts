"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth";
import {
  type ImportProspectsResult,
  createBusinessWorkflow,
  deleteBusinessWorkflow,
  importProspectsWorkflow,
  listBusinessesWorkflow,
  recordCallAttemptWorkflow,
  updateBusinessWorkflow,
} from "../../lib/services/businesses";
import type { Business } from "../../lib/schemas/business";

async function currentUserId(): Promise<string> {
  const { userId } = await requireUser();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

export type BusinessOutcome =
  | { ok: true; business: Business }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function listBusinessesAction(): Promise<Business[]> {
  const userId = await currentUserId();

  return listBusinessesWorkflow(userId);
}

export async function createBusinessAction(
  input: unknown,
): Promise<BusinessOutcome> {
  const userId = await currentUserId();

  try {
    const business = await createBusinessWorkflow(userId, input);

    revalidatePath("/prospect-board");

    return { ok: true, business };
  } catch (error) {
    return failure(error, "Could not add the prospect.");
  }
}

export async function updateBusinessAction(
  input: unknown,
): Promise<BusinessOutcome> {
  const userId = await currentUserId();

  try {
    const business = await updateBusinessWorkflow(userId, input);

    if (!business) {
      return { ok: false, error: "That prospect no longer exists." };
    }

    revalidatePath("/prospect-board");

    return { ok: true, business };
  } catch (error) {
    return failure(error, "Could not save that change.");
  }
}

export type DeleteOutcome = { ok: true } | { ok: false; error: string };

export async function recordCallAttemptAction(
  input: unknown,
): Promise<BusinessOutcome> {
  const userId = await currentUserId();

  try {
    const business = await recordCallAttemptWorkflow(userId, input);

    if (!business) {
      return { ok: false, error: "That prospect no longer exists." };
    }

    revalidatePath("/prospect-board");

    return { ok: true, business };
  } catch (error) {
    return failure(error, "Could not record the call.");
  }
}

export async function deleteBusinessAction(
  input: unknown,
): Promise<DeleteOutcome> {
  const userId = await currentUserId();

  try {
    await deleteBusinessWorkflow(userId, input);

    revalidatePath("/prospect-board");

    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete that prospect.");
  }
}

export type ImportOutcome =
  | { ok: true; result: ImportProspectsResult }
  | { ok: false; error: string };

export async function importProspectsAction(
  input: unknown,
): Promise<ImportOutcome> {
  const userId = await currentUserId();

  try {
    const result = await importProspectsWorkflow(userId, input);

    revalidatePath("/prospect-board");

    return { ok: true, result };
  } catch (error) {
    return failure(error, "Could not import that backup.");
  }
}
