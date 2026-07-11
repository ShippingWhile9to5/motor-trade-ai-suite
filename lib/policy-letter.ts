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
] as const;

export type Insurer = (typeof INSURERS)[number];

export const DRIVER_BASIS_OPTIONS = [
  "Any Employee for Business use, Named for SDP",
  "Named Drivers for Business use, Named for SDP",
  "Any Driver for Business use, Any Driver for SDP",
] as const;

export type DriverBasis = (typeof DRIVER_BASIS_OPTIONS)[number];

export interface PolicyLetterManualInput {
  insurer: Insurer | "";
  driverBasis: DriverBasis | "";
  businessDescription: string;
  premiumExclIPT: number | "";
  ipt: number | "";
  vat: number | "";
  adminFee: number | "";
  depositRequired: boolean;
  depositPercentage: number | "";
  investecFinanceRate: number | "";
  investecAPR: number | "";
  insurerInstalmentAvailable: boolean;
  insurerInstalmentRate: number | "";
  insurerInstalmentMonths: 10 | 12;
  insurersApproached: Insurer[];
  specialNotes: string;
}

export interface CalculatedTotals {
  subtotal: number;
  total: number;
}

export const blankPolicyLetterManualInput: PolicyLetterManualInput = {
  insurer: "",
  driverBasis: "",
  businessDescription: "",
  premiumExclIPT: "",
  ipt: "",
  vat: "",
  adminFee: "",
  depositRequired: true,
  depositPercentage: 10,
  investecFinanceRate: "",
  investecAPR: "",
  insurerInstalmentAvailable: false,
  insurerInstalmentRate: "",
  insurerInstalmentMonths: 10,
  insurersApproached: [],
  specialNotes: "",
};

interface InvestecFinanceCalculation {
  deposit: number;
  amountToFinance: number;
  totalChargeForCredit: number;
  totalAmountPayable: number;
  monthlyPayment: number;
}

interface InsurerInstalmentCalculation {
  totalChargeForCredit: number;
  totalAmountPayable: number;
  monthlyPayment: number;
}

export function calculateInvestecFinance(
  totalPremium: number,
  depositPercentage: number,
  financeRate: number,
): InvestecFinanceCalculation {
  const deposit = totalPremium * (depositPercentage / 100);
  const amountToFinance = totalPremium - deposit;
  const totalChargeForCredit = amountToFinance * (financeRate / 100);
  const totalAmountPayable = amountToFinance + totalChargeForCredit;
  const monthlyPayment = totalAmountPayable / 10;

  return {
    deposit,
    amountToFinance,
    totalChargeForCredit,
    totalAmountPayable,
    monthlyPayment,
  };
}

export function calculateInsurerInstalment(
  totalPremium: number,
  depositPercentage: number,
  instalmentRate: number,
  instalmentMonths: number,
): InsurerInstalmentCalculation {
  const deposit = totalPremium * (depositPercentage / 100);
  const amountToFinance = totalPremium - deposit;
  const totalChargeForCredit = amountToFinance * (instalmentRate / 100);
  const totalAmountPayable = amountToFinance + totalChargeForCredit;
  const monthlyPayment = totalAmountPayable / instalmentMonths;

  return {
    totalChargeForCredit,
    totalAmountPayable,
    monthlyPayment,
  };
}

export function calculateTotals(
  input: PolicyLetterManualInput,
): CalculatedTotals {
  const premium = typeof input.premiumExclIPT === "number" ? input.premiumExclIPT : 0;
  const ipt = typeof input.ipt === "number" ? input.ipt : 0;
  const vat = typeof input.vat === "number" ? input.vat : 0;
  const adminFee = typeof input.adminFee === "number" ? input.adminFee : 0;

  const subtotal = premium + ipt + vat;

  return { subtotal, total: subtotal + adminFee };
}

function formatCurrency(amount: number | ""): string {
  if (amount === "" || amount === 0) return "0.00";
  return amount.toFixed(2);
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getEffectiveDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return formatDate(nextMonth);
}

export function generateLetter(
  extractedData: ExtractedPolicyData | null,
  manualInput: PolicyLetterManualInput,
): string {
  const sections: string[] = [];

  const driverBasis =
    extractedData?.driverBasis || manualInput.driverBasis || "the driver basis provided";

  const effectiveDate = getEffectiveDate();
  sections.push(
    `Thank you for getting in touch with us for a quotation for your Motor Trade Combined. We are pleased to provide the quotation below for a policy effective 00:01 on ${effectiveDate} and is based upon the details you have provided. The quotation is based on ${driverBasis}.`,
  );

  if (manualInput.specialNotes) {
    sections.push("");
    sections.push(manualInput.specialNotes);
  }

  sections.push("");

  const premium = typeof manualInput.premiumExclIPT === "number" ? manualInput.premiumExclIPT : 0;
  const ipt = typeof manualInput.ipt === "number" ? manualInput.ipt : 0;
  const vat = typeof manualInput.vat === "number" ? manualInput.vat : 0;
  const adminFee = typeof manualInput.adminFee === "number" ? manualInput.adminFee : 0;
  const total = premium + ipt + vat + adminFee;

  sections.push("(£)");

  if (vat > 0) {
    sections.push(`Premium excl. Tax: ${formatCurrency(premium)}`);
    sections.push(`IPT: ${formatCurrency(ipt)}`);
    sections.push(`VAT: ${formatCurrency(vat)}`);
  } else {
    sections.push(`Premium excl. IPT: ${formatCurrency(premium)}`);
    sections.push(`IPT: ${formatCurrency(ipt)}`);
  }

  sections.push(`Admin Fee: ${formatCurrency(adminFee)}`);
  sections.push(`Total: £${formatCurrency(total)}`);
  sections.push("");

  if (
    manualInput.depositRequired &&
    typeof manualInput.depositPercentage === "number" &&
    manualInput.depositPercentage > 0
  ) {
    sections.push(`A ${manualInput.depositPercentage}% Deposit is required to hold cover.`);
    sections.push("");
  }

  if (
    typeof manualInput.investecFinanceRate === "number" &&
    manualInput.investecFinanceRate > 0 &&
    typeof manualInput.investecAPR === "number"
  ) {
    const depositPct =
      typeof manualInput.depositPercentage === "number" ? manualInput.depositPercentage : 10;

    const investec = calculateInvestecFinance(total, depositPct, manualInput.investecFinanceRate);

    sections.push("Investec Premium Finance");
    sections.push(`Interest is ${manualInput.investecFinanceRate}% instalments over 10 months.`);
    sections.push(
      `Based on premium £${formatCurrency(total)} minus ${depositPct}% deposit of £${formatCurrency(investec.deposit)}, balance £${formatCurrency(investec.amountToFinance)}:`,
    );
    sections.push("");
    sections.push(`Total charge for credit: £${formatCurrency(investec.totalChargeForCredit)}`);
    sections.push(`10 monthly payments of: £${formatCurrency(investec.monthlyPayment)}`);
    sections.push(`Total amount payable: £${formatCurrency(investec.totalAmountPayable)}`);
    sections.push(`APR: ${manualInput.investecAPR}%`);
    sections.push("");
  }

  if (manualInput.insurerInstalmentAvailable) {
    if (
      typeof manualInput.insurerInstalmentRate === "number" &&
      manualInput.insurerInstalmentRate > 0
    ) {
      const depositPct =
        typeof manualInput.depositPercentage === "number" ? manualInput.depositPercentage : 10;

      const insurer = calculateInsurerInstalment(
        total,
        depositPct,
        manualInput.insurerInstalmentRate,
        manualInput.insurerInstalmentMonths,
      );

      sections.push("Insurer's Own Instalment Option");
      sections.push(
        `Interest is ${manualInput.insurerInstalmentRate}% instalments over ${manualInput.insurerInstalmentMonths} months.`,
      );
      sections.push("");
      sections.push(`${manualInput.insurerInstalmentMonths} monthly payments of: £${formatCurrency(insurer.monthlyPayment)}`);
      sections.push(`Total charge for credit: £${formatCurrency(insurer.totalChargeForCredit)}`);
      sections.push(`Total amount payable: £${formatCurrency(insurer.totalAmountPayable)}`);
      sections.push("");
    }
  } else if (
    typeof manualInput.investecFinanceRate === "number" &&
    manualInput.investecFinanceRate > 0
  ) {
    sections.push("Insurer's Own Instalment Option not available.");
    sections.push("");
  }

  if (extractedData) {
    if (extractedData.excesses && extractedData.excesses.length > 0) {
      sections.push("EXCESSES");
      extractedData.excesses.forEach((excess) => {
        sections.push(`${excess.category}: ${excess.amount}`);
      });
      sections.push("");
    }

    const allEndorsementsAndConditions = [
      ...(extractedData.endorsements || []),
      ...(extractedData.conditions || []),
    ];

    if (allEndorsementsAndConditions.length > 0) {
      sections.push("ENDORSEMENTS & CONDITIONS");
      sections.push("");
      allEndorsementsAndConditions.forEach((item) => {
        sections.push(item);
      });
      sections.push("");
    }

    const allExclusions = [
      ...(extractedData.exclusions || []),
      ...(extractedData.coverNotIncluded || []),
    ];

    if (allExclusions.length > 0) {
      sections.push("SIGNIFICANT EXCLUSIONS AND NON STANDARD EXCESSES");
      sections.push("");
      allExclusions.forEach((exclusion) => {
        sections.push(exclusion);
      });
      sections.push("");
    }
  }

  if (manualInput.insurersApproached.length > 0) {
    const insurersList = manualInput.insurersApproached.join(", ");
    sections.push(`In sourcing this risk we approached the following insurers: ${insurersList}`);

    if (manualInput.insurer) {
      sections.push(
        `${manualInput.insurer} offered a competitive quotation based on ${driverBasis}.`,
      );
    }
  }

  return sections.join("\n");
}
