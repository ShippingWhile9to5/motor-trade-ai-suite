import type { CreateBusinessInput } from "./schemas/business";
import type { CompanySearchResult } from "./schemas/companies-house";

// Quick picks for the search form, grouped by the book they belong to. The
// grouping is the point: a flat list says nothing about which codes are worth
// searching for the class you are writing today.
//
// Labels are shortened for a button; the code beside each one is what actually
// gets searched, and the official Companies House wording is in the comment
// where the two differ enough to matter.
export const SIC_CODE_GROUPS = [
  {
    label: "Motor trade",
    codes: [
      { code: "45112", label: "Used car dealers" },
      { code: "45111", label: "New car dealers" },
      { code: "45200", label: "Repair & servicing" },
      { code: "45190", label: "Other vehicle sales" },
      { code: "45400", label: "Motorcycles" },
      { code: "45320", label: "Parts — retail" },
      { code: "45310", label: "Parts — wholesale" },
      { code: "77110", label: "Vehicle leasing" },
    ],
  },
  {
    label: "Fleet & haulage",
    codes: [
      // "Freight transport by road"
      { code: "49410", label: "Road freight (haulage)" },
      // "Removal services"
      { code: "49420", label: "Removals" },
      // "Renting and leasing of trucks and other heavy vehicles"
      { code: "77120", label: "Truck rental" },
      // "Other transportation support activities" — freight forwarders, many
      // of whom run their own vehicles.
      { code: "52290", label: "Transport support" },
      // "Taxi operation"
      { code: "49320", label: "Taxi operation" },
    ],
  },
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
    follow_up: null,
    notes: null,
    source: "finder",
  };
}
