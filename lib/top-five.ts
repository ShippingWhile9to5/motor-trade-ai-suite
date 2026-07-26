// The list you take into the monthly sales meeting: your most advanced live
// deals, as text you can paste straight into Word or an email.

import type { Business } from "./schemas/business";
import type { QuoteWithClient } from "./schemas/quote";
import { STAGE_LABELS } from "./quote-tracker";
import { formatMoney } from "./reporting";

export type TopProspect = {
  businessId: string;
  name: string;
  status: string;
  premium: number | null;
  insurer: string | null;
  stageLabel: string | null;
  followUp: string | null;
};

// A quoted deal you are waiting on outranks one you have only spoken to, and
// within that a higher rating wins. That matches how you'd pick five to report.
const STATUS_RANK: Record<string, number> = {
  quoting: 3,
  contacted: 2,
  prospect: 1,
  won: 0,
  lost: 0,
};

const STATUS_LABEL: Record<string, string> = {
  quoting: "Quoted",
  contacted: "Contacted",
  prospect: "To contact",
};

export function pickTopProspects(
  businesses: Business[],
  quotes: QuoteWithClient[],
  count = 5,
): TopProspect[] {
  const liveQuotesByBusiness = new Map<string, QuoteWithClient>();

  for (const quote of quotes) {
    if (quote.outcome) {
      continue;
    }

    const held = liveQuotesByBusiness.get(quote.business_id);

    // Keep the furthest-along quote when a firm has more than one in flight.
    if (!held || quote.stage > held.stage) {
      liveQuotesByBusiness.set(quote.business_id, quote);
    }
  }

  return businesses
    .filter(
      (business) =>
        business.pipeline_status !== "won" && business.pipeline_status !== "lost",
    )
    .map((business) => {
      const quote = liveQuotesByBusiness.get(business.id) ?? null;

      return {
        businessId: business.id,
        name: business.name,
        status: STATUS_LABEL[business.pipeline_status] ?? business.pipeline_status,
        premium: quote?.quoted_premium ?? null,
        insurer: quote?.insurer ?? null,
        stageLabel: quote ? (STAGE_LABELS[quote.stage] ?? null) : null,
        followUp: business.follow_up,
        _rank: STATUS_RANK[business.pipeline_status] ?? 0,
        _premium: quote?.quoted_premium ?? 0,
        _rating: business.rating ?? 0,
      };
    })
    .sort((a, b) => {
      if (a._rank !== b._rank) return b._rank - a._rank;
      if (a._rating !== b._rating) return b._rating - a._rating;
      if (a._premium !== b._premium) return b._premium - a._premium;
      return a.name.localeCompare(b.name);
    })
    .slice(0, count)
    .map(({ _rank, _premium, _rating, ...prospect }) => {
      void _rank;
      void _premium;
      void _rating;
      return prospect;
    });
}

export function formatUkDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);

  if (!year || !month || !day) {
    return iso;
  }

  const months = [
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

  return `${day} ${months[month - 1]} ${year}`;
}

// Plain text on purpose — this gets pasted into Word or an email body, not
// opened in a spreadsheet.
export function formatTopProspects(
  prospects: TopProspect[],
  today: string,
): string {
  if (prospects.length === 0) {
    return "No live prospects to report.";
  }

  const lines = [`Top ${prospects.length} prospects — ${formatUkDate(today)}`, ""];

  prospects.forEach((prospect, index) => {
    lines.push(`${index + 1}. ${prospect.name} — ${prospect.status}`);

    const detail: string[] = [];

    if (prospect.insurer) {
      detail.push(prospect.insurer);
    }

    if (prospect.premium != null) {
      detail.push(`quoted ${formatMoney(prospect.premium)}`);
    }

    if (prospect.stageLabel) {
      detail.push(prospect.stageLabel.toLowerCase());
    }

    if (detail.length > 0) {
      lines.push(`   ${detail.join(" · ")}`);
    }
  });

  return lines.join("\n");
}
