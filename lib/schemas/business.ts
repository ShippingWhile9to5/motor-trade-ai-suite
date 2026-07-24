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
  notes: z.string().nullable().default(null),
  source: businessSourceSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

// Fields a caller may set when creating a business. `user_id` is supplied by
// the service from the authenticated session, never by the client.
export const createBusinessInputSchema = z.object({
  name: z.string().trim().min(1, "Business name is required."),
  company_number: z.string().trim().nullable().default(null),
  company_status: z.string().trim().nullable().default(null),
  incorporated: z.string().trim().nullable().default(null),
  location: z.string().trim().nullable().default(null),
  address: z.string().trim().nullable().default(null),
  directors: z.array(directorSchema).default([]),
  phone: z.string().trim().nullable().default(null),
  mobile: z.string().trim().nullable().default(null),
  email: z.string().trim().nullable().default(null),
  website: z.string().trim().nullable().default(null),
  franchise: z.string().trim().nullable().default(null),
  services: z.string().trim().nullable().default(null),
  profile: z.string().trim().nullable().default(null),
  opportunity: z.string().trim().nullable().default(null),
  approach_angle: z.string().trim().nullable().default(null),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  pipeline_status: businessPipelineStatusSchema.default("prospect"),
  notes: z.string().trim().nullable().default(null),
  source: businessSourceSchema.default("manual"),
});

export type BusinessPipelineStatus = z.infer<
  typeof businessPipelineStatusSchema
>;
export type Director = z.infer<typeof directorSchema>;
export type Business = z.infer<typeof businessSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
