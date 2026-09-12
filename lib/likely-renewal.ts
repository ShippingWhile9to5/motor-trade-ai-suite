// A guess at when a prospect's motor trade policy renews, worked out from the
// date the company was incorporated. Pure logic, no I/O.
//
// The reasoning, from the broker's own experience: a firm sets up, starts
// trading, and takes out cover two or three months later — then renews on that
// anniversary every year. So a company incorporated in March most likely
// renews in May or June, and the time to be in front of them is April.
//
// It is a heuristic and is labelled as one everywhere it shows. It is for
// deciding who to ring this month; the moment the broker actually speaks to
// the firm and learns the real date, a call-back replaces it.

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// How long after incorporation cover is usually taken out.
export const RENEWAL_OFFSET_MONTHS = [2, 3] as const;

// A window opening within this many months counts as "renewing soon" — far
// enough out to get a quote in front of them before their renewal lands.
export const RENEWING_SOON_MONTHS = 2;

export type RenewalWindow = {
  /** 1–12 */
  startMonth: number;
  /** 1–12 */
  endMonth: number;
  /** e.g. "May–Jun" */
  label: string;
  /** e.g. "Mar 2019", the fact this was worked out from. */
  incorporatedLabel: string;
};

// The Finder stores the incorporation date as it is shown, DD/MM/YYYY. An ISO
// date is accepted too, so a manually typed one works either way.
export function parseIncorporated(
  value: string | null,
): { year: number; month: number } | null {
  if (!value) {
    return null;
  }

  const uk = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (uk) {
    return { year: Number(uk[3]), month: Number(uk[2]) };
  }

  const iso = /^(\d{4})-(\d{2})-\d{2}/.exec(value.trim());

  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]) };
  }

  return null;
}

function wrapMonth(month: number): number {
  return ((month - 1 + 12) % 12) + 1;
}

export function likelyRenewalWindow(
  incorporated: string | null,
): RenewalWindow | null {
  const parsed = parseIncorporated(incorporated);

  if (!parsed || parsed.month < 1 || parsed.month > 12) {
    return null;
  }

  const startMonth = wrapMonth(parsed.month + RENEWAL_OFFSET_MONTHS[0]);
  const endMonth = wrapMonth(parsed.month + RENEWAL_OFFSET_MONTHS[1]);

  return {
    startMonth,
    endMonth,
    label: `${MONTH_SHORT[startMonth - 1]}–${MONTH_SHORT[endMonth - 1]}`,
    incorporatedLabel: `${MONTH_SHORT[parsed.month - 1]} ${parsed.year}`,
  };
}

// Whole months from now until the window is reached: 0 while inside it, 1 if
// it opens next month, and so on round the year. A window that has just
// passed is therefore ten or eleven months away, not "recently" — the point
// is the next renewal, not the last one.
export function monthsUntilRenewal(
  window: RenewalWindow,
  today: string,
): number {
  const match = /^\d{4}-(\d{2})/.exec(today);
  const thisMonth = match ? Number(match[1]) : 1;

  const distances = [window.startMonth, window.endMonth].map(
    (month) => (month - thisMonth + 12) % 12,
  );

  // Inside the window, when the start has passed but the end has not.
  const inside =
    (window.startMonth <= window.endMonth &&
      thisMonth >= window.startMonth &&
      thisMonth <= window.endMonth) ||
    (window.startMonth > window.endMonth &&
      (thisMonth >= window.startMonth || thisMonth <= window.endMonth));

  return inside ? 0 : Math.min(...distances);
}

export function isRenewingSoon(
  incorporated: string | null,
  today: string,
): boolean {
  const window = likelyRenewalWindow(incorporated);

  return window !== null && monthsUntilRenewal(window, today) <= RENEWING_SOON_MONTHS;
}

// For sorting: soonest first, and a firm with nothing to go on sinks to the
// bottom rather than sorting as if it were due now.
export function renewalSortKey(
  incorporated: string | null,
  today: string,
): number {
  const window = likelyRenewalWindow(incorporated);

  return window ? monthsUntilRenewal(window, today) : Number.POSITIVE_INFINITY;
}
