import type { CreateBusinessInput } from "./schemas/business";
import type { CompanySearchResult } from "./schemas/companies-house";

// Common motor-trade SIC codes, offered as quick picks in the search form.
export const MOTOR_TRADE_SIC_CODES = [
  { code: "45112", label: "Used car dealers" },
  { code: "45111", label: "New car dealers" },
  { code: "45200", label: "Repair & servicing" },
  { code: "45190", label: "Other vehicle sales" },
  { code: "45400", label: "Motorcycles" },
  { code: "45320", label: "Parts — retail" },
  { code: "45310", label: "Parts — wholesale" },
  { code: "77110", label: "Vehicle leasing" },
] as const;

export function formatCompanyAddress(result: CompanySearchResult): string {
  return [result.address_line_1, result.locality, result.postal_code]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatIncorporatedDate(dateStr: string): string {
  if (!dateStr) {
    return "";
  }

  const [year, month, day] = dateStr.split("-");

  if (!year || !month || !day) {
    return dateStr;
  }

  return `${day}/${month}/${year}`;
}

// Map a Companies House result onto the fields we store for a saved prospect.
export function companyToBusinessInput(
  result: CompanySearchResult,
): CreateBusinessInput {
  return {
    name: result.company_name,
    company_number: result.company_number || null,
    company_status: result.company_status || null,
    incorporated: formatIncorporatedDate(result.date_of_creation) || null,
    location: result.locality || null,
    address: formatCompanyAddress(result) || null,
    directors: [],
    phone: null,
    mobile: null,
    email: null,
    website: null,
    franchise: null,
    services: result.sic_codes.join(", ") || null,
    profile: null,
    opportunity: null,
    approach_angle: null,
    rating: null,
    pipeline_status: "prospect",
    notes: null,
    source: "finder",
  };
}
