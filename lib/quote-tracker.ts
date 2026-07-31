// Pure quote-tracker logic: stage definitions and the SLA urgency engine.
// Ported from the standalone quote-tracker app. No I/O here.

export const QUOTE_STAGES = [1, 2, 3, 4, 5, 6] as const;

export const CLOSED_STAGE = 6;

// Stages 4 and 5 are the client-facing half of the job: the quote goes out to
// the client, and if they push back on price it goes back to the insurer for a
// sharper number. That loop can run more than once before the client decides.
export const STAGE_LABELS: Record<number, string> = {
  1: "Submitted",
  2: "Awaiting Reply",
  3: "Quoted",
  4: "Sent to Client",
  5: "Back to Insurer",
  6: "Closed",
};

export const STAGE_ACTIONS: Record<number, string> = {
  1: "Chase insurer for reply",
  2: "Respond to insurer questions",
  3: "Send the quote to the client",
  4: "Chase the client for a decision",
  5: "Chase insurer for a revised price",
  6: "Closed",
};

// Days in a stage before a card turns amber, then red. Stages waiting on the
// insurer (1, 2) and closed (6) are never flagged — they're not the broker's
// action to chase.
export const SLA_THRESHOLDS: Record<number, { amber: number; red: number }> = {
  1: { amber: Infinity, red: Infinity },
  2: { amber: Infinity, red: Infinity },
  3: { amber: 1, red: 2 },
  4: { amber: 3, red: 5 },
  5: { amber: 3, red: 5 },
  6: { amber: Infinity, red: Infinity },
};

export const QUOTE_INSURERS = [
  "Covea",
  "Aviva",
  "AXA",
  "Allianz",
  "Niche",
  "Arch",
  "Jensten",
  "Intact",
  "Unicorn",
] as const;

export const QUOTE_TYPES = ["New Business", "Renewal"] as const;

// The product, as it appears on the commission spreadsheet — not to be
// confused with QUOTE_TYPES, which is whether it is new or a renewal. Motor
// trade is the bulk of the book; the rest are occasional, and anything not
// listed can be typed in.
export const POLICY_TYPES = [
  "Motor Trade Combined",
  "Road Risks",
  "Fleet",
  "Contractors Combined",
  "Property Owners",
] as const;

export type UrgencyLevel = "none" | "amber" | "red";

export function getDaysInStage(stageEnteredAt: string | Date): number {
  const entered = new Date(stageEnteredAt);
  const now = new Date();

  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
}

// An outcome means the quote is finished, so it never asks to be chased again
// however long it sits there.
export function getUrgency(
  stage: number,
  stageEnteredAt: string | Date,
  outcome: string | null = null,
): UrgencyLevel {
  if (stage === CLOSED_STAGE || outcome) {
    return "none";
  }

  const thresholds = SLA_THRESHOLDS[stage];

  if (!thresholds) {
    return "none";
  }

  const days = getDaysInStage(stageEnteredAt);

  if (days >= thresholds.red) {
    return "red";
  }

  if (days >= thresholds.amber) {
    return "amber";
  }

  return "none";
}

// A submission is one risk sent out on one day, and each insurer it went to
// has its own card. Grouping them puts a client on one line in a column
// instead of five, which matters most on the day it goes out — when every
// insurer is sitting in the same stage saying the same thing.
export type SubmissionGroup<T> = {
  key: string;
  clientName: string;
  submissionDate: string;
  quotes: T[];
};

type Groupable = {
  business_id: string;
  submission_date: string;
  client_name: string;
};

export function groupBySubmission<T extends Groupable>(
  quotes: T[],
): SubmissionGroup<T>[] {
  const groups: SubmissionGroup<T>[] = [];
  const byKey = new Map<string, SubmissionGroup<T>>();

  for (const quote of quotes) {
    // Keyed by the date as well as the firm, so a renewal quoted in March and
    // a new risk quoted in July stay apart rather than merging into one pile.
    const key = `${quote.business_id}:${quote.submission_date}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.quotes.push(quote);

      continue;
    }

    // Order of first appearance, so the caller's sort still decides what sits
    // at the top of a column.
    const group: SubmissionGroup<T> = {
      key,
      clientName: quote.client_name,
      submissionDate: quote.submission_date,
      quotes: [quote],
    };

    byKey.set(key, group);
    groups.push(group);
  }

  return groups;
}
