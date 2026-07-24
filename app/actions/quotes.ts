"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth";
import {
  createQuoteWorkflow,
  deleteQuoteWorkflow,
  listQuotesWithClientsWorkflow,
  updateQuoteWorkflow,
} from "../../lib/services/quotes";
import type { QuoteWithClient } from "../../lib/schemas/quote";

async function currentUserId(): Promise<string> {
  const { userId } = await requireUser();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

export async function listQuotesAction(): Promise<QuoteWithClient[]> {
  const userId = await currentUserId();

  return listQuotesWithClientsWorkflow(userId);
}

export async function createQuoteAction(
  input: unknown,
): Promise<QuoteWithClient> {
  const userId = await currentUserId();
  const quote = await createQuoteWorkflow(userId, input);

  revalidatePath("/quote-tracker");

  return quote;
}

export async function updateQuoteAction(
  input: unknown,
): Promise<QuoteWithClient | null> {
  const userId = await currentUserId();
  const quote = await updateQuoteWorkflow(userId, input);

  revalidatePath("/quote-tracker");

  return quote;
}

export async function deleteQuoteAction(input: unknown): Promise<void> {
  const userId = await currentUserId();

  await deleteQuoteWorkflow(userId, input);

  revalidatePath("/quote-tracker");
}
