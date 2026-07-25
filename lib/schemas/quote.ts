import { z } from "zod";

export const quoteOutcomeSchema = z.enum(["Won", "Lost", "NTU"]);

export const quoteSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  business_id: z.string().uuid(),
  insurer: z.string(),
  quote_type: z.string(),
  submission_date: z.string(),
  stage: z.number().int().min(1).max(6),
  notes: z.string().nullable().default(null),
  target_premium: z.number().nullable().default(null),
  last_year_premium: z.number().nullable().default(null),
  quoted_premium: z.number().nullable().default(null),
  // The first price the insurer put up, captured automatically so a
  // negotiated reduction doesn't erase what it started at.
  initial_quoted_premium: z.number().nullable().default(null),
  outcome: quoteOutcomeSchema.nullable().default(null),
  // Commission is typed in by hand — it varies by insurer and scheme, so it
  // is not derived from the premium.
  commission: z.number().nullable().default(null),
  // Stamped when the outcome is set. stage_entered_at is not a safe substitute
  // because moving the stage afterwards would reset it and shift the quarter
  // a deal was won in.
  closed_at: z.string().nullable().default(null),
  stage_entered_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// A quote plus its client's display name, joined for the board. The client
// name lives on the shared business record, not on the quote.
export const quoteWithClientSchema = quoteSchema.extend({
  client_name: z.string(),
});

const premiumValue = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value === null || value === "") {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  })
  .nullable();

const premiumField = premiumValue.default(null);

// On an update, a field that was not supplied must stay undefined so it is
// left alone. Applying .optional() to a schema that already carries
// .default(null) would wrap the default rather than replace it, and an absent
// key would parse to null — quietly wiping the premium it was not asked to
// touch.
const optionalPremiumField = premiumValue.optional();

// The form supplies a client name; the service resolves it to a business
// (creating one if needed), so the client is only ever entered once.
export const createQuoteInputSchema = z.object({
  client_name: z.string().trim().min(1, "Client name is required."),
  insurer: z.string().trim().min(1, "Insurer is required."),
  quote_type: z.string().trim().default("New Business"),
  submission_date: z.string().trim().min(1, "Submission date is required."),
  stage: z.number().int().min(1).max(6).default(1),
  notes: z.string().trim().nullable().default(null),
  target_premium: premiumField,
  last_year_premium: premiumField,
  quoted_premium: premiumField,
});

export const updateQuoteInputSchema = z.object({
  id: z.string().uuid(),
  insurer: z.string().trim().min(1).optional(),
  quote_type: z.string().trim().optional(),
  submission_date: z.string().trim().min(1).optional(),
  stage: z.number().int().min(1).max(6).optional(),
  notes: z.string().trim().nullable().optional(),
  target_premium: optionalPremiumField,
  last_year_premium: optionalPremiumField,
  quoted_premium: optionalPremiumField,
  // Editable so a mistyped first figure can be corrected, but normally the
  // service fills this in on its own.
  initial_quoted_premium: optionalPremiumField,
  commission: optionalPremiumField,
  outcome: quoteOutcomeSchema.nullable().optional(),
});

export const deleteQuoteInputSchema = z.object({
  id: z.string().uuid(),
});

export type QuoteOutcome = z.infer<typeof quoteOutcomeSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type QuoteWithClient = z.infer<typeof quoteWithClientSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteInputSchema>;
