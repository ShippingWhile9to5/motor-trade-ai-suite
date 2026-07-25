import "server-only";

import {
  type QuoteWithClient,
  createQuoteInputSchema,
  deleteQuoteInputSchema,
  updateQuoteInputSchema,
} from "../schemas/quote";
import {
  deleteQuote,
  getQuoteById,
  insertQuote,
  listQuotes,
  updateQuoteRow,
} from "../repositories/quotes";
import {
  getBusinessById,
  listBusinesses,
  updateBusinessPipelineStatus,
} from "../repositories/businesses";
import { findOrCreateBusinessByName } from "./businesses";
import { CLOSED_STAGE } from "../quote-tracker";
import { todayIso } from "../reporting";

// Join each quote to its client's name from the shared business records,
// so the board can show "Brookway Cars" without denormalising it onto quotes.
export async function listQuotesWithClientsWorkflow(
  userId: string,
): Promise<QuoteWithClient[]> {
  const [quotes, businesses] = await Promise.all([
    listQuotes(userId),
    listBusinesses(userId),
  ]);

  const namesById = new Map(businesses.map((b) => [b.id, b.name]));

  return quotes.map((quote) => ({
    ...quote,
    client_name: namesById.get(quote.business_id) ?? "Unknown client",
  }));
}

export async function createQuoteWorkflow(
  userId: string,
  input: unknown,
): Promise<QuoteWithClient> {
  const data = createQuoteInputSchema.parse(input);

  // Find or create the client, and mark them as in the quoting stage of the
  // pipeline (unless they're already further along, e.g. won).
  const business = await findOrCreateBusinessByName(userId, data.client_name, {
    pipeline_status: "quoting",
  });

  if (business.pipeline_status === "prospect" || business.pipeline_status === "contacted") {
    await updateBusinessPipelineStatus(userId, business.id, "quoting");
  }

  const quote = await insertQuote(userId, {
    business_id: business.id,
    insurer: data.insurer,
    quote_type: data.quote_type,
    submission_date: data.submission_date,
    stage: data.stage,
    notes: data.notes,
    target_premium: data.target_premium,
    last_year_premium: data.last_year_premium,
    quoted_premium: data.quoted_premium,
    initial_quoted_premium: data.quoted_premium,
  });

  return { ...quote, client_name: business.name };
}

export async function updateQuoteWorkflow(
  userId: string,
  input: unknown,
): Promise<QuoteWithClient | null> {
  const data = updateQuoteInputSchema.parse(input);
  const { id, ...changes } = data;

  const existing = await getQuoteById(userId, id);

  if (!existing) {
    return null;
  }

  // Only write what was actually supplied. A key that arrives undefined must
  // never reach the update, or it would overwrite a stored value with nothing.
  const patch: Record<string, unknown> = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );

  // The first price the insurer puts up is recorded once, without the broker
  // having to type it twice — later reductions overwrite quoted_premium only,
  // so what it started at survives the haggling.
  if (
    changes.quoted_premium != null &&
    changes.initial_quoted_premium === undefined &&
    existing.initial_quoted_premium == null
  ) {
    patch.initial_quoted_premium = changes.quoted_premium;
  }

  // An outcome means the quote is finished, so it closes itself rather than
  // relying on a second click that is easy to forget.
  if (changes.outcome != null && changes.stage === undefined) {
    patch.stage = CLOSED_STAGE;
  }

  // Date the win the day it happens, so quarterly totals stay put even if the
  // stage is moved afterwards. Clearing the outcome clears the date with it.
  if (changes.outcome !== undefined && changes.outcome !== existing.outcome) {
    patch.closed_at = changes.outcome === null ? null : todayIso();
  }

  // Moving to a new stage restarts the SLA clock for that stage.
  const nextStage = patch.stage as number | undefined;

  if (nextStage !== undefined && nextStage !== existing.stage) {
    patch.stage_entered_at = new Date().toISOString();
  }

  const updated = await updateQuoteRow(userId, id, patch);

  if (!updated) {
    return null;
  }

  // A won/lost outcome flips the shared client record to match, so the
  // dashboard's "won clients" reflects it without re-entry.
  if (changes.outcome === "Won") {
    await updateBusinessPipelineStatus(userId, updated.business_id, "won");
  } else if (changes.outcome === "Lost" || changes.outcome === "NTU") {
    await updateBusinessPipelineStatus(userId, updated.business_id, "lost");
  }

  const business = await getBusinessById(userId, updated.business_id);

  return { ...updated, client_name: business?.name ?? "Unknown client" };
}

export async function deleteQuoteWorkflow(
  userId: string,
  input: unknown,
): Promise<void> {
  const { id } = deleteQuoteInputSchema.parse(input);

  await deleteQuote(userId, id);
}
