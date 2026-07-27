import type { ExtractedPolicyData } from "./schemas/policy-letter";

export const INSURERS = [
  "Arch Insurance",
  "Covéa Insurance",
  "Intact (NIG)",
  "AXA",
  "Niche",
  "Unicorn",
  "Aviva",
  "Allianz",
  "Jensten",
] as const;

// A listed insurer, or anything typed into the "Other" box — the list covers
// the usual panel, not every insurer that can ever put up a quote.
export type Insurer = (typeof INSURERS)[number] | (string & {});

export const DRIVER_BASIS_OPTIONS = [
  "Any Employee for Business use, Named for SDP",
  "Named Drivers for Business use, Named for SDP",
  "Any Driver for Business use, Any Driver for SDP",
  "Any driver for Business and named for SDP use",
] as const;

export type DriverBasis = (typeof DRIVER_BASIS_OPTIONS)[number];

export interface PolicyLetterBenefits {
  premierProtectedNcd: boolean;
  lowClaimsRebate: boolean;
}

const NO_BENEFITS: PolicyLetterBenefits = {
  premierProtectedNcd: false,
  lowClaimsRebate: false,
};

// Insurers that include these benefits as standard. Applied when the insurer
// is selected; the broker can still tick/untick either one afterwards.
const INSURER_DEFAULT_BENEFITS: Partial<Record<Insurer, PolicyLetterBenefits>> = {
  "Intact (NIG)": { premierProtectedNcd: true, lowClaimsRebate: true },
  "Covéa Insurance": { premierProtectedNcd: true, lowClaimsRebate: false },
};

export function defaultBenefitsForInsurer(
  insurer: Insurer | "",
): PolicyLetterBenefits {
  if (insurer === "") {
    return { ...NO_BENEFITS };
  }

  return { ...(INSURER_DEFAULT_BENEFITS[insurer] ?? NO_BENEFITS) };
}

export interface PolicyLetterManualInput {
  insurer: Insurer | "";
  driverBasis: DriverBasis | "";
  driverBasisOverride: string;
  benefits: PolicyLetterBenefits;
  /** ISO `YYYY-MM-DD`, as produced by an `<input type="date">`. */
  quoteDate: string;
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

export function createBlankPolicyLetterManualInput(): PolicyLetterManualInput {
  return {
    insurer: "",
    driverBasis: "",
    driverBasisOverride: "",
    benefits: { ...NO_BENEFITS },
    quoteDate: todayIsoDate(),
  };
}

const QUOTE_VALIDITY_DAYS = 30;

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** e.g. `12th August 2026` */
export function formatUkLongDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "long" });

  return `${day}${ordinalSuffix(day)} ${month} ${date.getFullYear()}`;
}

export function calculateValidityDate(quoteDateIso: string): string {
  // Build the date from its parts so a UTC-parsed ISO string can't shift the
  // day backwards for anyone west of GMT.
  const [year, month, day] = quoteDateIso.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  const validity = new Date(year, month - 1, day);
  validity.setDate(validity.getDate() + QUOTE_VALIDITY_DAYS);

  return formatUkLongDate(validity);
}

function benefitNames(benefits: PolicyLetterBenefits): string[] {
  const names: string[] = [];

  if (benefits.premierProtectedNcd) {
    names.push("Premier Protected NCD");
  }

  if (benefits.lowClaimsRebate) {
    names.push("Low Claims Rebate");
  }

  return names;
}

function toNaturalList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

export function resolveDriverBasis(input: PolicyLetterManualInput): string {
  return (input.driverBasisOverride.trim() || input.driverBasis).trim();
}

export function generateOpeningParagraph(
  input: PolicyLetterManualInput,
): string {
  const sentences = [
    "Thank you for getting in touch with us for a quotation for your Motor Trade Combined.",
    `We are pleased to provide the quotation below which is valid until ${calculateValidityDate(input.quoteDate)} and is based upon the details you have provided.`,
  ];

  const benefits = benefitNames(input.benefits);

  if (benefits.length > 0) {
    sentences.push(`This policy includes the ${toNaturalList(benefits)}.`);
  }

  const driverBasis = resolveDriverBasis(input);

  if (driverBasis) {
    sentences.push(`The driver basis for this policy is ${driverBasis}.`);
  }

  return sentences.join(" ");
}

export interface PolicyLetterOutputs {
  openingParagraph: string;
  endorsementsAndConditions: string;
  significantExclusions: string;
  excesses: string;
}

export function generatePolicyLetterOutputs(
  extractedData: ExtractedPolicyData | null,
  input: PolicyLetterManualInput,
): PolicyLetterOutputs {
  return {
    openingParagraph: generateOpeningParagraph(input),
    endorsementsAndConditions: (
      extractedData?.endorsementsAndConditions ?? []
    ).join("\n"),
    significantExclusions: (extractedData?.exclusions ?? []).join("\n"),
    excesses: (extractedData?.excesses ?? []).join("\n"),
  };
}
