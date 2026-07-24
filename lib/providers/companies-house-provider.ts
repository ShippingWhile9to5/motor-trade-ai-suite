import "server-only";

import { env } from "../../env";
import {
  type SearchCompaniesInput,
  type SearchCompaniesResult,
  companySearchResultSchema,
} from "../schemas/companies-house";

const ADVANCED_SEARCH_URL =
  "https://api.company-information.service.gov.uk/advanced-search/companies";

type RawAddress = {
  address_line_1?: string;
  locality?: string;
  postal_code?: string;
};

type RawItem = {
  company_name?: string;
  company_number?: string;
  company_status?: string;
  date_of_creation?: string;
  sic_codes?: string[];
  registered_office_address?: RawAddress;
};

function normaliseItem(item: RawItem) {
  const address = item.registered_office_address ?? {};

  return companySearchResultSchema.parse({
    company_name: item.company_name ?? "",
    company_number: item.company_number ?? "",
    company_status: item.company_status ?? "",
    date_of_creation: item.date_of_creation ?? "",
    sic_codes: item.sic_codes ?? [],
    address_line_1: address.address_line_1 ?? "",
    locality: address.locality ?? "",
    postal_code: address.postal_code ?? "",
  });
}

export async function searchCompaniesBySic(
  input: SearchCompaniesInput,
): Promise<SearchCompaniesResult> {
  const apiKey = env.COMPANIES_HOUSE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Companies House search is not configured. Add COMPANIES_HOUSE_API_KEY.",
    );
  }

  const params = new URLSearchParams({
    sic_codes: input.sic_code,
    size: "50",
    start_index: "0",
  });

  if (input.area) {
    params.set("location", input.area);
  }

  if (!input.include_dissolved) {
    params.set("company_status", "active");
  }

  // Companies House uses HTTP Basic auth with the API key as the username.
  const credentials = Buffer.from(`${apiKey}:`).toString("base64");

  const response = await fetch(`${ADVANCED_SEARCH_URL}?${params}`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    throw new Error(
      `Companies House returned ${response.status}. Check the SIC code and API key.`,
    );
  }

  const data = (await response.json()) as { items?: RawItem[]; hits?: number };

  return {
    items: (data.items ?? []).map(normaliseItem),
    total: data.hits ?? 0,
  };
}
