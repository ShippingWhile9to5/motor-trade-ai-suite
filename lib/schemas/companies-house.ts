import { z } from "zod";

// A Companies House search result, normalised to the fields we display and map
// onto a business record.
export const companySearchResultSchema = z.object({
  company_name: z.string(),
  company_number: z.string(),
  company_status: z.string(),
  date_of_creation: z.string().default(""),
  sic_codes: z.array(z.string()).default([]),
  address_line_1: z.string().default(""),
  locality: z.string().default(""),
  postal_code: z.string().default(""),
});

export const searchCompaniesInputSchema = z.object({
  sic_code: z
    .string()
    .trim()
    .min(1, "A SIC code is required.")
    .regex(/^\d{4,5}$/, "A SIC code is 4 or 5 digits."),
  area: z.string().trim().default(""),
  include_dissolved: z.boolean().default(false),
});

export const searchCompaniesResultSchema = z.object({
  items: z.array(companySearchResultSchema),
  total: z.number(),
});

export type CompanySearchResult = z.infer<typeof companySearchResultSchema>;
export type SearchCompaniesInput = z.infer<typeof searchCompaniesInputSchema>;
export type SearchCompaniesResult = z.infer<typeof searchCompaniesResultSchema>;
