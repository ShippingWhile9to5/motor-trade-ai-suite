// The quarterly commission return: the sheet that goes to the manager so the
// broker gets paid. Column for column, this mirrors the spreadsheet it
// replaces, so what comes out can be pasted straight back into it.

import type { QuoteWithClient } from "./schemas/quote";
import { type Quarter, formatMoney, quarterKey, quarterLabel, quarterOf } from "./reporting";

// The broker's share of what the company earns on a deal.
export const BROKER_SHARE = 0.2;

export type CommissionRow = {
  quoteId: string;
  policyholder: string;
  policyType: string;
  insurer: string;
  grossPremium: number | null;
  commissionIncome: number | null;
  feeIncome: number | null;
  totalIncome: number;
  share: number;
};

export type CommissionTotals = {
  grossPremium: number;
  commissionIncome: number;
  feeIncome: number;
  totalIncome: number;
  share: number;
  missingCommission: number;
};

export const COMMISSION_COLUMNS = [
  "Policyholder",
  "Policy type",
  "Insurers",
  "Gross premium",
  "Commission income",
  "Fee income",
  "Total income",
  `${Math.round(BROKER_SHARE * 100)}%`,
] as const;

// Total income is what the company earns: commission plus any fee. The
// broker's share is a flat cut of that, matching the spreadsheet's formulas.
export function commissionRowFor(quote: QuoteWithClient): CommissionRow {
  const commissionIncome = quote.commission;
  const feeIncome = quote.fee;
  const totalIncome = (commissionIncome ?? 0) + (feeIncome ?? 0);

  return {
    quoteId: quote.id,
    policyholder: quote.client_name,
    policyType: quote.policy_type ?? "",
    insurer: quote.insurer,
    grossPremium: quote.quoted_premium,
    commissionIncome,
    feeIncome,
    totalIncome,
    share: totalIncome * BROKER_SHARE,
  };
}

export function commissionRowsForQuarter(
  quotes: QuoteWithClient[],
  quarter: Quarter,
): CommissionRow[] {
  return quotes
    .filter((quote) => {
      if (quote.outcome !== "Won" || !quote.closed_at) {
        return false;
      }

      const period = quarterOf(quote.closed_at);

      return period !== null && quarterKey(period) === quarterKey(quarter);
    })
    .map(commissionRowFor)
    .sort((a, b) => a.policyholder.localeCompare(b.policyholder));
}

export function commissionTotals(rows: CommissionRow[]): CommissionTotals {
  return {
    grossPremium: rows.reduce((sum, row) => sum + (row.grossPremium ?? 0), 0),
    commissionIncome: rows.reduce(
      (sum, row) => sum + (row.commissionIncome ?? 0),
      0,
    ),
    feeIncome: rows.reduce((sum, row) => sum + (row.feeIncome ?? 0), 0),
    totalIncome: rows.reduce((sum, row) => sum + row.totalIncome, 0),
    share: rows.reduce((sum, row) => sum + row.share, 0),
    // A blank commission would understate the return without saying so.
    missingCommission: rows.filter((row) => row.commissionIncome == null).length,
  };
}

// Quarters that actually have wins in them, newest first, with the current
// quarter always offered so a return can be started before the first deal.
export function quartersWithWins(
  quotes: QuoteWithClient[],
  current: Quarter,
): Quarter[] {
  const seen = new Map<string, Quarter>();

  seen.set(quarterKey(current), current);

  for (const quote of quotes) {
    if (quote.outcome !== "Won" || !quote.closed_at) {
      continue;
    }

    const period = quarterOf(quote.closed_at);

    if (period) {
      seen.set(quarterKey(period), period);
    }
  }

  return [...seen.values()].sort((a, b) =>
    quarterKey(b).localeCompare(quarterKey(a)),
  );
}

function money(value: number | null): string {
  return value == null ? "" : value.toFixed(2);
}

// Tab-separated on purpose: pasting this into Excel drops each value into its
// own cell, which a comma-separated line does not do reliably with UK figures.
export function formatCommissionTsv(
  rows: CommissionRow[],
  quarter: Quarter,
): string {
  const totals = commissionTotals(rows);
  const lines = [
    COMMISSION_COLUMNS.join("\t"),
    ...rows.map((row) =>
      [
        row.policyholder,
        row.policyType,
        row.insurer,
        money(row.grossPremium),
        money(row.commissionIncome),
        money(row.feeIncome),
        row.totalIncome.toFixed(2),
        row.share.toFixed(2),
      ].join("\t"),
    ),
    [
      `Total ${quarterLabel(quarter)}`,
      "",
      "",
      totals.grossPremium.toFixed(2),
      totals.commissionIncome.toFixed(2),
      totals.feeIncome.toFixed(2),
      totals.totalIncome.toFixed(2),
      totals.share.toFixed(2),
    ].join("\t"),
  ];

  return lines.join("\n");
}

export function formatCommissionMoney(value: number | null): string {
  return value == null ? "—" : formatMoney(value);
}
