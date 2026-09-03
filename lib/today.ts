// What needs doing today, pulled from the four places work can hide: your own
// reminders, call-back dates on the board, quotes past their SLA, and policies
// coming up for renewal.

import type { Business } from "./schemas/business";
import type { QuoteWithClient } from "./schemas/quote";
import type { Reminder } from "./schemas/reminder";
import { STAGE_ACTIONS, getDaysInStage, getUrgency } from "./quote-tracker";
import { todayIso } from "./reporting";
import { upcomingRenewals } from "./renewals";

export type TodayKind = "reminder" | "follow-up" | "quote" | "renewal";

export type TodayItem = {
  id: string;
  // The record this row came from, so the row can be edited where it is shown
  // rather than sending you off to the tool it belongs to.
  sourceId: string;
  kind: TodayKind;
  title: string;
  detail: string;
  dueDate: string | null;
  overdue: boolean;
  businessId: string | null;
};

function isDueOrOverdue(date: string, today: string): boolean {
  return date <= today;
}

export function buildTodayList(
  {
    reminders,
    businesses,
    quotes,
  }: {
    reminders: Reminder[];
    businesses: Business[];
    quotes: QuoteWithClient[];
  },
  today: string = todayIso(),
): TodayItem[] {
  const items: TodayItem[] = [];
  const namesById = new Map(businesses.map((business) => [business.id, business.name]));
  // A firm with a quote in flight is already chased by that quote's own SLA
  // row below, so its call-back would be the same job listed twice.
  const beingQuoted = new Set(
    quotes
      .filter((quote) => quote.outcome === null)
      .map((quote) => quote.business_id),
  );

  for (const reminder of reminders) {
    if (reminder.done || !isDueOrOverdue(reminder.due_date, today)) {
      continue;
    }

    const attached = reminder.business_id
      ? namesById.get(reminder.business_id)
      : null;

    items.push({
      id: `reminder:${reminder.id}`,
      sourceId: reminder.id,
      kind: "reminder",
      title: reminder.body,
      detail: attached ?? "Note to self",
      dueDate: reminder.due_date,
      overdue: reminder.due_date < today,
      businessId: reminder.business_id,
    });
  }

  for (const business of businesses) {
    // A won or lost firm is off the chase list however old its date is. So is
    // one whose quote is live — chased on the quote, not on the call-back.
    // Tested on the quote rather than the status, so a firm marked "quoting"
    // whose quotes have all closed still shows its call-back.
    if (
      !business.follow_up ||
      business.pipeline_status === "won" ||
      business.pipeline_status === "lost" ||
      business.pipeline_status === "not_interested" ||
      beingQuoted.has(business.id) ||
      !isDueOrOverdue(business.follow_up, today)
    ) {
      continue;
    }

    items.push({
      id: `follow-up:${business.id}`,
      sourceId: business.id,
      kind: "follow-up",
      title: business.name,
      detail: business.phone ? `Call back · ${business.phone}` : "Call back due",
      dueDate: business.follow_up,
      overdue: business.follow_up < today,
      businessId: business.id,
    });
  }

  for (const quote of quotes) {
    const urgency = getUrgency(quote.stage, quote.stage_entered_at, quote.outcome);

    if (urgency === "none") {
      continue;
    }

    const days = getDaysInStage(quote.stage_entered_at);

    items.push({
      id: `quote:${quote.id}`,
      sourceId: quote.id,
      kind: "quote",
      title: quote.client_name,
      detail: `${STAGE_ACTIONS[quote.stage]} · ${quote.insurer} · ${days} day${days === 1 ? "" : "s"}`,
      dueDate: null,
      overdue: urgency === "red",
      businessId: quote.business_id,
    });
  }

  // A renewal a month out is a call to make, so it belongs in the list you
  // already work through each morning rather than in a tab you have to
  // remember to open.
  for (const renewal of upcomingRenewals(quotes, today)) {
    items.push({
      id: `renewal:${renewal.quoteId}`,
      sourceId: renewal.quoteId,
      kind: "renewal",
      title: renewal.clientName,
      detail: `Renews ${renewal.renewalDate} · ${renewal.insurer}${
        renewal.policyType ? ` · ${renewal.policyType}` : ""
      }`,
      dueDate: renewal.renewalDate,
      // Past its renewal date is late in a way a call-back never is: the
      // client is out of cover or has gone elsewhere.
      overdue: renewal.daysAway <= 0,
      businessId: renewal.businessId,
    });
  }

  // Overdue first, then by date, so the oldest thing you have let slip is the
  // first thing you see.
  return items.sort((a, b) => {
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1;
    }

    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return a.title.localeCompare(b.title);
  });
}
