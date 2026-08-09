// Won-book reporting: calendar months and quarters, and the totals behind the
// Won tab. Pure logic, no I/O.

import type { QuoteWithClient } from "./schemas/quote";

export type Quarter = { year: number; quarter: 1 | 2 | 3 | 4 };

export type Month = { year: number; month: number };

export type MonthTotals = Month & {
  key: string;
  label: string;
  won: number;
  premium: number;
  commission: number;
};

export type WonTotals = {
  won: number;
  premium: number;
  commission: number;
  fee: number;
  totalIncome: number;
  missingCommission: number;
};

// Local date, not UTC — `new Date().toISOString()` would roll a late-evening
// win into tomorrow for anyone east of GMT, and back a day west of it.
export function todayIso(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

// Calendar quarters: Q1 is January to March.
export function quarterOf(dateIso: string): Quarter | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(dateIso);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, quarter: (Math.floor((month - 1) / 3) + 1) as Quarter["quarter"] };
}

export function quarterKey({ year, quarter }: Quarter): string {
  return `${year}-Q${quarter}`;
}

export function quarterLabel({ year, quarter }: Quarter): string {
  return `Q${quarter} ${`${year}`.slice(2)}`;
}

// Commission is paid quarterly, so the return stays quarterly — but the month
// is how the work actually feels, and nothing here could answer "how am I
// doing this month" until now.
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthOf(dateIso: string): Month | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(dateIso);

  if (!match) {
    return null;
  }

  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return { year: Number(match[1]), month };
}

export function monthKey({ year, month }: Month): string {
  return `${year}-${`${month}`.padStart(2, "0")}`;
}

export function monthLabel({ year, month }: Month): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function monthShortLabel({ year, month }: Month): string {
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${`${year}`.slice(2)}`;
}

// The quarter a month is reported in — what the manager is sent, and so what
// Copy for Excel emits however the table is being viewed.
export function quarterOfMonth({ year, month }: Month): Quarter {
  return {
    year,
    quarter: (Math.floor((month - 1) / 3) + 1) as Quarter["quarter"],
  };
}

export function isWon(quote: QuoteWithClient): boolean {
  return quote.outcome === "Won";
}

export function sumWon(quotes: QuoteWithClient[]): WonTotals {
  const won = quotes.filter(isWon);

  return {
    won: won.length,
    premium: won.reduce((total, quote) => total + (quote.quoted_premium ?? 0), 0),
    commission: won.reduce((total, quote) => total + (quote.commission ?? 0), 0),
    fee: won.reduce((total, quote) => total + (quote.fee ?? 0), 0),
    // What the work actually earned, and the figure the return pays on:
    // commission alone understates it by every fee charged.
    totalIncome: won.reduce(
      (total, quote) => total + (quote.commission ?? 0) + (quote.fee ?? 0),
      0,
    ),
    // Manual commission entry means a figure can simply be missed. Counting
    // them keeps the totals honest rather than quietly understated.
    missingCommission: won.filter((quote) => quote.commission == null).length,
  };
}

// The same series a month at a time. Twelve months says far more about a run
// rate than the same span as four quarters does.
function monthIndex({ year, month }: Month): number {
  return year * 12 + (month - 1);
}

export function monthlyTotals(
  quotes: QuoteWithClient[],
  maxMonths = 12,
  today: string = todayIso(),
): MonthTotals[] {
  const current = monthOf(today);

  if (!current) {
    return [];
  }

  // Start at the first win rather than a fixed span back, so a new book does
  // not open on a run of empty months from before it existed.
  const firstWin = quotes
    .filter((quote) => isWon(quote) && quote.closed_at)
    .map((quote) => monthOf(quote.closed_at as string))
    .filter((period): period is Month => period !== null)
    .reduce<Month | null>(
      (earliest, period) =>
        !earliest || monthIndex(period) < monthIndex(earliest) ? period : earliest,
      null,
    );

  const span = firstWin ? monthIndex(current) - monthIndex(firstWin) + 1 : 1;
  const count = Math.min(Math.max(span, 1), maxMonths);

  const buckets = new Map<string, MonthTotals>();
  const series: MonthTotals[] = [];

  for (let step = count - 1; step >= 0; step -= 1) {
    const offset = monthIndex(current) - step;
    const period: Month = {
      year: Math.floor(offset / 12),
      month: (offset % 12) + 1,
    };
    const bucket: MonthTotals = {
      ...period,
      key: monthKey(period),
      label: monthShortLabel(period),
      won: 0,
      premium: 0,
      commission: 0,
    };

    buckets.set(bucket.key, bucket);
    series.push(bucket);
  }

  for (const quote of quotes) {
    if (!isWon(quote) || !quote.closed_at) {
      continue;
    }

    const period = monthOf(quote.closed_at);
    const bucket = period ? buckets.get(monthKey(period)) : undefined;

    if (!bucket) {
      continue;
    }

    bucket.won += 1;
    bucket.premium += quote.quoted_premium ?? 0;
    bucket.commission += quote.commission ?? 0;
  }

  return series;
}

// Money is shown to the penny, always. These are figures the broker types in
// and reports on, so a rounded £631 standing for £630.75 is a wrong number,
// not a tidier one.
export function formatMoney(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// The one place a rounded figure is honest: a bar on a chart is already an
// approximation, and the exact amount is on its tooltip.
export function formatMoneyRounded(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
