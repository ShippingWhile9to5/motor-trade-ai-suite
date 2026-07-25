import { z } from "zod";

export const businessPipelineStatusSchema = z.enum([
  "prospect",
  "contacted",
  "quoting",
  "won",
  "lost",
]);

export const businessSourceSchema = z.enum(["manual", "finder", "import"]);

export const directorSchema = z.object({
  name: z.string(),
  role: z.string().default(""),
  appointed: z.string().default(""),
});

// Free-text fields are stored as NULL rather than "" when left blank, so an
// empty box on the add form and an absent value mean the same thing.
const nullableText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = (value ?? "").trim();

    return trimmed === "" ? null : trimmed;
  });

// A follow-up is either an ISO date from a date input, or nothing.
const nullableIsoDate = nullableText.refine(
  (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Follow-up must be a date in YYYY-MM-DD form.",
);

export const businessSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  company_number: z.string().nullable().default(null),
  company_status: z.string().nullable().default(null),
  incorporated: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  directors: z.array(directorSchema).default([]),
  phone: z.string().nullable().default(null),
  mobile: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
  franchise: z.string().nullable().default(null),
  services: z.string().nullable().default(null),
  profile: z.string().nullable().default(null),
  opportunity: z.string().nullable().default(null),
  approach_angle: z.string().nullable().default(null),
  rating: z.number().int().nullable().default(null),
  pipeline_status: businessPipelineStatusSchema,
  follow_up: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  source: businessSourceSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

// Fields a caller may set when creating a business. `user_id` is supplied by
// the service from the authenticated session, never by the client.
export const createBusinessInputSchema = z.object({
  name: z.string().trim().min(1, "Business name is required."),
  company_number: nullableText.default(null),
  company_status: nullableText.default(null),
  incorporated: nullableText.default(null),
  location: nullableText.default(null),
  address: nullableText.default(null),
  directors: z.array(directorSchema).default([]),
  phone: nullableText.default(null),
  mobile: nullableText.default(null),
  email: nullableText.default(null),
  website: nullableText.default(null),
  franchise: nullableText.default(null),
  services: nullableText.default(null),
  profile: nullableText.default(null),
  opportunity: nullableText.default(null),
  approach_angle: nullableText.default(null),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  pipeline_status: businessPipelineStatusSchema.default("prospect"),
  follow_up: nullableIsoDate.default(null),
  notes: nullableText.default(null),
  source: businessSourceSchema.default("manual"),
});

// Fields the Prospect Board may edit in place. Everything is optional so a
// single-field edit sends only that field; `source` and `user_id` are not
// editable — they record where the record came from and who owns it.
export const updateBusinessInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Business name is required.").optional(),
  company_number: nullableText.optional(),
  company_status: nullableText.optional(),
  incorporated: nullableText.optional(),
  location: nullableText.optional(),
  address: nullableText.optional(),
  directors: z.array(directorSchema).optional(),
  phone: nullableText.optional(),
  mobile: nullableText.optional(),
  email: nullableText.optional(),
  website: nullableText.optional(),
  franchise: nullableText.optional(),
  services: nullableText.optional(),
  profile: nullableText.optional(),
  opportunity: nullableText.optional(),
  approach_angle: nullableText.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  pipeline_status: businessPipelineStatusSchema.optional(),
  follow_up: nullableIsoDate.optional(),
  notes: nullableText.optional(),
});

export type BusinessPipelineStatus = z.infer<
  typeof businessPipelineStatusSchema
>;
export type Director = z.infer<typeof directorSchema>;
export type Business = z.infer<typeof businessSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessInputSchema>;
