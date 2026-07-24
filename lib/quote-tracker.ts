// Pure quote-tracker logic: stage definitions and the SLA urgency engine.
// Ported from the standalone quote-tracker app. No I/O here.

export const QUOTE_STAGES = [1, 2, 3, 4, 5] as const;

export const STAGE_LABELS: Record<number, string> = {
  1: "Submitted",
  2: "Awaiting Reply",
  3: "Quoted",
  4: "Feedback Given",
  5: "Closed",
};

export const STAGE_ACTIONS: Record<number, string> = {
  1: "Chase insurer for reply",
  2: "Respond to insurer questions",
  3: "Give feedback to insurer",
  4: "Chase outcome from insurer",
  5: "Closed",
};

// Days in a stage before a card turns amber, then red. Stages waiting on the
// insurer (1, 2) and closed (5) are never flagged — they're not the broker's
// action to chase.
export const SLA_THRESHOLDS: Record<number, { amber: number; red: number }> = {
  1: { amber: Infinity, red: Infinity },
  2: { amber: Infinity, red: Infinity },
  3: { amber: 1, red: 2 },
  4: { amber: 3, red: 5 },
  5: { amber: Infinity, red: Infinity },
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

export function getUrgency(
  stage: number,
  stageEnteredAt: string | Date,
): UrgencyLevel {
  if (stage === 5) {
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
