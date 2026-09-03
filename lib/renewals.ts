// When a policy comes up for renewal, and which ones need acting on now.
// Pure logic, no I/O.

import type { QuoteWithClient } from "./schemas/quote";
import { todayIso } from "./reporting";

// A month's notice: enough to get in front of the client early rather than
// scrambling at the last minute, which is the whole point of knowing.
export const RENEWAL_NOTICE_DAYS = 30;

// Motor trade policies run twelve months. Worked out from the date cover
// started rather than stored, so correcting that date moves the renewal too.
export function renewalDateOf(coverStart: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(coverStart);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  // Anniversary of the same day, a year on. A 29 February inception renews on
  // 1 March in a common year, which is what the Date arithmetic gives us and
  // what an insurer would do anyway.
  const anniversary = new Date(
    Date.UTC(Number(year) + 1, Number(month) - 1, Number(day)),
  );

  return anniversary.toISOString().slice(0, 10);
}

export function daysUntil(dateIso: string, today: string): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${dateIso}T00:00:00Z`);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export type UpcomingRenewal = {
  quoteId: string;
  businessId: string;
  clientName: string;
  insurer: string;
  policyType: string;
  renewalDate: string;
  daysAway: number;
};

// Won policies whose renewal is within the notice period — and that nobody is
// already working on. Raising the quote is the thing the reminder was asking
// for, so once it exists the renewal has served its purpose and the quote's
// own SLA clock takes over.
export function upcomingRenewals(
  quotes: QuoteWithClient[],
  today: string = todayIso(),
  noticeDays: number = RENEWAL_NOTICE_DAYS,
): UpcomingRenewal[] {
  const beingWorkedOn = new Set(
    quotes
      .filter((quote) => quote.outcome === null)
      .map((quote) => quote.business_id),
  );

  const renewals: UpcomingRenewal[] = [];

  for (const quote of quotes) {
    if (quote.outcome !== "Won" || !quote.cover_start) {
      continue;
    }

    if (beingWorkedOn.has(quote.business_id)) {
      continue;
    }

    const renewalDate = renewalDateOf(quote.cover_start);

    if (!renewalDate) {
      continue;
    }

    const daysAway = daysUntil(renewalDate, today);

    if (daysAway > noticeDays) {
      continue;
    }

    renewals.push({
      quoteId: quote.id,
      businessId: quote.business_id,
      clientName: quote.client_name,
      insurer: quote.insurer,
      policyType: quote.policy_type ?? "",
      renewalDate,
      daysAway,
    });
  }

  // Soonest first, and anything already past its date at the very top.
  return renewals.sort(
    (a, b) => a.daysAway - b.daysAway || a.clientName.localeCompare(b.clientName),
  );
}
