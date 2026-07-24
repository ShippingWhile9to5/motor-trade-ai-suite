import "server-only";

import { companyToBusinessInput } from "../prospect-finder";
import { searchCompaniesBySic } from "../providers/companies-house-provider";
import {
  type SearchCompaniesResult,
  companySearchResultSchema,
  searchCompaniesInputSchema,
} from "../schemas/companies-house";
import {
  createBusiness,
  findBusinessByCompanyNumber,
  findBusinessByName,
} from "../repositories/businesses";
import type { Business } from "../schemas/business";

export async function searchCompaniesWorkflow(
  input: unknown,
): Promise<SearchCompaniesResult> {
  const data = searchCompaniesInputSchema.parse(input);

  return searchCompaniesBySic(data);
}

export type SaveProspectResult = {
  business: Business;
  alreadySaved: boolean;
};

// Save a Companies House result as a prospect. Deduplicates on the company
// number (or the name, for companies with no number) so re-saving the same
// firm returns the existing record instead of creating a duplicate.
export async function saveProspectFromFinderWorkflow(
  userId: string,
  input: unknown,
): Promise<SaveProspectResult> {
  const result = companySearchResultSchema.parse(input);

  const existing = result.company_number
    ? await findBusinessByCompanyNumber(userId, result.company_number)
    : await findBusinessByName(userId, result.company_name);

  if (existing) {
    return { business: existing, alreadySaved: true };
  }

  const business = await createBusiness(
    userId,
    companyToBusinessInput(result),
  );

  return { business, alreadySaved: false };
}
