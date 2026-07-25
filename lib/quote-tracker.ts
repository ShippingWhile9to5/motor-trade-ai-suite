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
  "Jenstons",
  "Intact",
] as const;

export const QUOTE_TYPES = ["New Business", "Renewal"] as const;

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
