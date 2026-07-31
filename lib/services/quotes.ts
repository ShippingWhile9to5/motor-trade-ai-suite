import "server-only";

import {
  type Quote,
  type QuoteWithClient,
  createQuoteInputSchema,
  createQuotesInputSchema,
  deleteQuoteInputSchema,
  updateQuoteInputSchema,
} from "../schemas/quote";
import {
  deleteQuote,
  getQuoteById,
  insertQuote,
  listQuotes,
  listQuotesForBusiness,
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

// One submission, one card per insurer: they come back separately, at their
// own pace and with their own price, so each needs its own stage and its own
// SLA clock. What they share is the client and the date it went out.
export async function createQuotesWorkflow(
  userId: string,
  input: unknown,
): Promise<QuoteWithClient[]> {
  const data = createQuotesInputSchema.parse(input);

  // A picked firm attaches by id, which is exact. A typed name falls back to
  // find-or-create, which matches on the name and so can only ever be as good
  // as the spelling. Resolved once, so five insurers cannot become five firms.
  const business = data.business_id
    ? await getBusinessById(userId, data.business_id)
    : await findOrCreateBusinessByName(userId, data.client_name, {
        pipeline_status: "quoting",
      });

  if (!business) {
    throw new Error("That client could not be found.");
  }

  if (business.pipeline_status === "prospect" || business.pipeline_status === "contacted") {
    await updateBusinessPipelineStatus(userId, business.id, "quoting");
  }

  const quotes: QuoteWithClient[] = [];

  for (const insurer of data.insurers) {
    const quote = await insertQuote(userId, {
      business_id: business.id,
      insurer,
      quote_type: data.quote_type,
      policy_type: data.policy_type,
      submission_date: data.submission_date,
      stage: data.stage,
      notes: data.notes,
      target_premium: data.target_premium,
      last_year_premium: data.last_year_premium,
      quoted_premium: data.quoted_premium,
      initial_quoted_premium: data.quoted_premium,
    });

    quotes.push({ ...quote, client_name: business.name });
  }

  return quotes;
}

export async function createQuoteWorkflow(
  userId: string,
  input: unknown,
): Promise<QuoteWithClient> {
  const { insurer, ...rest } = createQuoteInputSchema.parse(input);
  const [quote] = await createQuotesWorkflow(userId, {
    ...rest,
    insurers: [insurer],
  });

  return quote;
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
    // Placing the risk with one insurer settles the whole submission: the
    // others are not taken up, and should stop sitting on the board asking to
    // be chased.
    await closeSiblingQuotes(userId, updated);
    await updateBusinessPipelineStatus(userId, updated.business_id, "won");
  } else if (changes.outcome === "Lost" || changes.outcome === "NTU") {
    // But a loser closing must never demote a client whose business was won
    // on another insurer's quote — otherwise settling a submission would mark
    // the firm lost a moment after marking it won.
    const stillWon = await hasWonQuote(userId, updated.business_id);

    if (!stillWon) {
      await updateBusinessPipelineStatus(userId, updated.business_id, "lost");
    }
  }

  const business = await getBusinessById(userId, updated.business_id);

  return { ...updated, client_name: business?.name ?? "Unknown client" };
}

// The rest of the same submission — the other insurers the risk went out to
// on the same day, that are still waiting on an answer.
async function closeSiblingQuotes(
  userId: string,
  winner: Quote,
): Promise<void> {
  const siblings = await listQuotesForBusiness(userId, winner.business_id);
  const closedAt = todayIso();

  for (const sibling of siblings) {
    const sameSubmission =
      sibling.id !== winner.id &&
      sibling.submission_date === winner.submission_date &&
      sibling.outcome === null;

    if (!sameSubmission) {
      continue;
    }

    // Written straight to the row rather than back through this workflow, so
    // closing them cannot cascade into another round of status changes.
    await updateQuoteRow(userId, sibling.id, {
      outcome: "NTU",
      stage: CLOSED_STAGE,
      closed_at: closedAt,
      stage_entered_at: new Date().toISOString(),
    });
  }
}

async function hasWonQuote(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const quotes = await listQuotesForBusiness(userId, businessId);

  return quotes.some((quote) => quote.outcome === "Won");
}

export async function deleteQuoteWorkflow(
  userId: string,
  input: unknown,
): Promise<void> {
  const { id } = deleteQuoteInputSchema.parse(input);

  await deleteQuote(userId, id);
}
