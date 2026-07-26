// What needs doing today, pulled from the three places work can hide: your own
// reminders, call-back dates on the board, and quotes past their SLA.

import type { Business } from "./schemas/business";
import type { QuoteWithClient } from "./schemas/quote";
import type { Reminder } from "./schemas/reminder";
import { STAGE_ACTIONS, getDaysInStage, getUrgency } from "./quote-tracker";
import { todayIso } from "./reporting";

export type TodayKind = "reminder" | "follow-up" | "quote";

export type TodayItem = {
  id: string;
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

  for (const reminder of reminders) {
    if (reminder.done || !isDueOrOverdue(reminder.due_date, today)) {
      continue;
    }

    const attached = reminder.business_id
      ? namesById.get(reminder.business_id)
      : null;

    items.push({
      id: `reminder:${reminder.id}`,
      kind: "reminder",
      title: reminder.body,
      detail: attached ?? "Note to self",
      dueDate: reminder.due_date,
      overdue: reminder.due_date < today,
      businessId: reminder.business_id,
    });
  }

  for (const business of businesses) {
    // A won or lost firm is off the chase list however old its date is.
    if (
      !business.follow_up ||
      business.pipeline_status === "won" ||
      business.pipeline_status === "lost" ||
      !isDueOrOverdue(business.follow_up, today)
    ) {
      continue;
    }

    items.push({
      id: `follow-up:${business.id}`,
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
      kind: "quote",
      title: quote.client_name,
      detail: `${STAGE_ACTIONS[quote.stage]} · ${quote.insurer} · ${days} day${days === 1 ? "" : "s"}`,
      dueDate: null,
      overdue: urgency === "red",
      businessId: quote.business_id,
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
