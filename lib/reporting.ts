// Won-book reporting: calendar quarters, and the totals behind the Won tab.
// Pure logic, no I/O.

import type { QuoteWithClient } from "./schemas/quote";

export type Quarter = { year: number; quarter: 1 | 2 | 3 | 4 };

export type QuarterTotals = Quarter & {
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

export function isWon(quote: QuoteWithClient): boolean {
  return quote.outcome === "Won";
}

export function sumWon(quotes: QuoteWithClient[]): WonTotals {
  const won = quotes.filter(isWon);

  return {
    won: won.length,
    premium: won.reduce((total, quote) => total + (quote.quoted_premium ?? 0), 0),
    commission: won.reduce((total, quote) => total + (quote.commission ?? 0), 0),
    // Manual commission entry means a figure can simply be missed. Counting
    // them keeps the totals honest rather than quietly understated.
    missingCommission: won.filter((quote) => quote.commission == null).length,
  };
}

// Won quotes grouped into the quarter they closed in, oldest first. Quarters
// with nothing in them are filled in so the chart has no gaps.
export function quarterlyTotals(
  quotes: QuoteWithClient[],
  count = 6,
  today: string = todayIso(),
): QuarterTotals[] {
  const current = quarterOf(today);

  if (!current) {
    return [];
  }

  const buckets = new Map<string, QuarterTotals>();
  const series: QuarterTotals[] = [];

  for (let step = count - 1; step >= 0; step -= 1) {
    const offset = current.quarter - 1 - step;
    const year = current.year + Math.floor(offset / 4);
    const quarter = (((offset % 4) + 4) % 4) + 1;
    const bucket: QuarterTotals = {
      year,
      quarter: quarter as Quarter["quarter"],
      key: quarterKey({ year, quarter: quarter as Quarter["quarter"] }),
      label: quarterLabel({ year, quarter: quarter as Quarter["quarter"] }),
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

    const period = quarterOf(quote.closed_at);

    if (!period) {
      continue;
    }

    const bucket = buckets.get(quarterKey(period));

    if (!bucket) {
      continue;
    }

    bucket.won += 1;
    bucket.premium += quote.quoted_premium ?? 0;
    bucket.commission += quote.commission ?? 0;
  }

  return series;
}

export function formatMoney(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
