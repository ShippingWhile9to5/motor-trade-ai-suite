"use server";

import { requireUser } from "../../lib/auth";
import {
  type SaveProspectResult,
  saveProspectFromFinderWorkflow,
  searchCompaniesWorkflow,
} from "../../lib/services/prospect-finder";
import type { SearchCompaniesResult } from "../../lib/schemas/companies-house";

async function currentUserId(): Promise<string> {
  const { userId } = await requireUser();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

export type SearchOutcome =
  | { ok: true; result: SearchCompaniesResult }
  | { ok: false; error: string };

export async function searchCompaniesAction(
  input: unknown,
): Promise<SearchOutcome> {
  await currentUserId();

  try {
    const result = await searchCompaniesWorkflow(input);

    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Search failed.",
    };
  }
}

export type SaveOutcome =
  | { ok: true; result: SaveProspectResult }
  | { ok: false; error: string };

export async function saveProspectAction(input: unknown): Promise<SaveOutcome> {
  const userId = await currentUserId();

  try {
    const result = await saveProspectFromFinderWorkflow(userId, input);

    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save prospect.",
    };
  }
}
