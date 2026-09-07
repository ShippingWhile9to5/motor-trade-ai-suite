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

// Worded as they appear in real letters. The override box exists because this
// list will never cover every basis an insurer agrees to.
export const DRIVER_BASIS_OPTIONS = [
  "Any Employee under Contract of Service for Business use, named for SDP use",
  "Any Employee for Business use, Named for SDP",
  "Any Driver for Business Use, Named for SDP",
  "Open for Business Use, and Named for SDP",
  "Named Drivers for Business use, Named for SDP",
  "Any Driver for Business use, Any Driver for SDP",
] as const;

export type DriverBasis = (typeof DRIVER_BASIS_OPTIONS)[number];

// The lines that sit under "Important Information", each either included or
// not. They describe the basis the quotation was given on, which is why they
// belong in that section rather than in the opening paragraph.
export interface PolicyLetterBenefits {
  premierProtectedNcd: boolean;
  lowClaimsRebate: boolean;
  protectedNcd: boolean;
  unaccompaniedDemonstrations: boolean;
  loanAndHire: boolean;
  floodExcluded: boolean;
}

const NO_BENEFITS: PolicyLetterBenefits = {
  premierProtectedNcd: false,
  lowClaimsRebate: false,
  protectedNcd: false,
  unaccompaniedDemonstrations: false,
  loanAndHire: false,
  floodExcluded: false,
};

// One line each, worded as the letters word them.
const BENEFIT_LINES: { key: keyof PolicyLetterBenefits; line: string }[] = [
  { key: "premierProtectedNcd", line: "Quotation includes Premier Protected NCD" },
  { key: "lowClaimsRebate", line: "Quotation includes Low Claims Rebate" },
  { key: "protectedNcd", line: "Quotation includes protected no claims discount" },
  {
    key: "unaccompaniedDemonstrations",
    line: "Quotation includes unaccompanied demonstrations",
  },
  { key: "loanAndHire", line: "Quotation includes Loan and Hire vehicles" },
  { key: "floodExcluded", line: "Quotation excludes flood cover" },
];

// Insurers that include these benefits as standard. Applied when the insurer
// is selected; the broker can still tick/untick either one afterwards.
const INSURER_DEFAULT_BENEFITS: Partial<Record<Insurer, PolicyLetterBenefits>> = {
  "Intact (NIG)": {
    ...NO_BENEFITS,
    premierProtectedNcd: true,
    lowClaimsRebate: true,
  },
  "Covéa Insurance": { ...NO_BENEFITS, premierProtectedNcd: true },
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
  /** e.g. `100K` — becomes a single vehicle limit line when filled in. */
  singleVehicleLimit: string;
  /** Anything agreed on this risk that no tick-box covers, one per line. */
  extraInformation: string;
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
    singleVehicleLimit: "",
    extraInformation: "",
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

export function resolveDriverBasis(input: PolicyLetterManualInput): string {
  return (input.driverBasisOverride.trim() || input.driverBasis).trim();
}

// Pasted whole, with the validity date already worked out — that date is the
// only part of it that changes. The driver basis and the benefits deliberately
// do NOT appear here: in a real letter they sit under Important Information.
export function generateOpeningParagraph(
  input: PolicyLetterManualInput,
): string {
  return [
    "Thank you for getting in touch with us for a quotation for your Motor Trade Combined.",
    `We are pleased to provide the quotation below which is valid until ${calculateValidityDate(input.quoteDate)} and is based upon the details you have provided.`,
  ].join(" ");
}

// The section the broker types every time: the basis the quotation was given
// on. One statement per line, in the order the letters use.
export function generateImportantInformation(
  input: PolicyLetterManualInput,
): string {
  const lines: string[] = [];
  const driverBasis = resolveDriverBasis(input);

  if (driverBasis) {
    lines.push(`Driver basis is ${driverBasis}`);
  }

  for (const { key, line } of BENEFIT_LINES) {
    if (input.benefits[key]) {
      lines.push(line);
    }
  }

  const limit = input.singleVehicleLimit.trim();

  if (limit) {
    // Typed as "100K" or "£100,000" — either way it reads as a limit.
    const amount = limit.startsWith("£") ? limit : `£${limit}`;

    lines.push(`Single vehicle limit set at ${amount} for own and customer vehicles`);
  }

  // Anything this risk needed that no tick-box covers, kept exactly as typed.
  for (const extra of input.extraInformation.split("\n")) {
    if (extra.trim()) {
      lines.push(extra.trim());
    }
  }

  return lines.join("\n");
}

// The closing paragraph, word for word as it appears in every letter. Fixed
// text, so it is a constant rather than anything generated — and it is emitted
// verbatim, never reworded.
export const SCOPE_OF_SERVICE =
  "In recommending this product and insurer we have taken the following into account: " +
  "Their level of service. Premium cost. Their expertise in this field. " +
  "The length of time they have been established. " +
  "Their specialism in this type of insurance.";

// In the order the letter reads, top to bottom.
export interface PolicyLetterOutputs {
  openingParagraph: string;
  importantInformation: string;
  endorsementsAndConditions: string;
  policyExcesses: string;
  significantExclusions: string;
  scopeOfService: string;
}

export function generatePolicyLetterOutputs(
  extractedData: ExtractedPolicyData | null,
  input: PolicyLetterManualInput,
): PolicyLetterOutputs {
  return {
    openingParagraph: generateOpeningParagraph(input),
    importantInformation: generateImportantInformation(input),
    endorsementsAndConditions: (
      extractedData?.endorsementsAndConditions ?? []
    ).join("\n"),
    policyExcesses: (extractedData?.excesses ?? []).join("\n"),
    significantExclusions: (extractedData?.exclusions ?? []).join("\n"),
    scopeOfService: SCOPE_OF_SERVICE,
  };
}
