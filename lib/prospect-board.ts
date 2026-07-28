import type {
  Business,
  BusinessPipelineStatus,
  CreateBusinessInput,
} from "./schemas/business";
import type { ImportedActivity, ImportedProspect } from "./schemas/prospect-import";

export const PIPELINE_STATUSES: BusinessPipelineStatus[] = [
  "prospect",
  "contacted",
  "quoting",
  "won",
  "lost",
];

export const PIPELINE_STATUS_LABELS: Record<BusinessPipelineStatus, string> = {
  prospect: "Not contacted",
  contacted: "Contacted",
  quoting: "Quoting",
  won: "Won",
  lost: "Lost",
};

// A closed business is off the follow-up radar: no overdue or due-today flag.
const CLOSED_STATUSES: BusinessPipelineStatus[] = ["won", "lost"];

// The standalone board carried eight statuses. The suite runs on the five-stage
// spine shared with the Quote Tracker, so the finer prospecting states collapse
// onto it: anything past a first call is "contacted" until a quote exists.
const LEGACY_STATUS_MAP: Record<string, BusinessPipelineStatus> = {
  notcontacted: "prospect",
  called: "contacted",
  followup: "contacted",
  renewaldate: "contacted",
  factfind: "contacted",
  submitted: "quoting",
  quoted: "quoting",
  won: "won",
  dead: "lost",
};

export function mapLegacyPipelineStatus(value: string): BusinessPipelineStatus {
  return LEGACY_STATUS_MAP[value.trim().toLowerCase()] ?? "prospect";
}

export function todayIso(): string {
  const now = new Date();

  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

export type FollowUpState = "none" | "upcoming" | "due" | "overdue";

export function getFollowUpState(
  business: Pick<Business, "follow_up" | "pipeline_status">,
  today: string = todayIso(),
): FollowUpState {
  if (!business.follow_up) {
    return "none";
  }

  if (CLOSED_STATUSES.includes(business.pipeline_status)) {
    return "none";
  }

  if (business.follow_up < today) {
    return "overdue";
  }

  return business.follow_up === today ? "due" : "upcoming";
}

export function isDue(
  business: Pick<Business, "follow_up" | "pipeline_status">,
  today: string = todayIso(),
): boolean {
  const state = getFollowUpState(business, today);

  return state === "due" || state === "overdue";
}

export type BoardFilters = {
  search: string;
  status: BusinessPipelineStatus | "";
  onlyDue: boolean;
};

export type BoardSort = "rating" | "name" | "followUp" | "callable";

// Named views, so the board answers a question rather than showing everything
// and leaving you to find the answer in it.
export type BoardView = "due" | "to-contact" | "working" | "all";

export const BOARD_VIEWS: { value: BoardView; label: string }[] = [
  { value: "due", label: "Due today" },
  { value: "to-contact", label: "To contact" },
  { value: "working", label: "Working" },
  { value: "all", label: "All" },
];

// Each view opens in the order that suits its job: you look things up in All
// by name, but you work down To contact best-first.
export const DEFAULT_SORT_FOR_VIEW: Record<BoardView, BoardSort> = {
  due: "followUp",
  "to-contact": "callable",
  working: "followUp",
  all: "name",
};

export function filterByView(
  businesses: Business[],
  view: BoardView,
  today: string = todayIso(),
): Business[] {
  if (view === "all") {
    return businesses;
  }

  if (view === "due") {
    return businesses.filter((business) => isDue(business, today));
  }

  if (view === "to-contact") {
    return businesses.filter(
      (business) => business.pipeline_status === "prospect",
    );
  }

  return businesses.filter(
    (business) =>
      business.pipeline_status === "contacted" ||
      business.pipeline_status === "quoting",
  );
}

function haystack(business: Business): string {
  return [
    business.name,
    business.location,
    business.address,
    business.franchise,
    business.services,
    business.notes,
    business.company_number,
    ...business.directors.map((director) => director.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchBusinesses(
  businesses: Business[],
  search: string,
): Business[] {
  const query = search.trim().toLowerCase();

  if (query === "") {
    return businesses;
  }

  return businesses.filter((business) => haystack(business).includes(query));
}

export function filterBusinesses(
  businesses: Business[],
  filters: BoardFilters,
  today: string = todayIso(),
): Business[] {
  return searchBusinesses(businesses, filters.search).filter((business) => {
    if (filters.onlyDue && !isDue(business, today)) {
      return false;
    }

    return !filters.status || business.pipeline_status === filters.status;
  });
}

export function sortBusinesses(
  businesses: Business[],
  sort: BoardSort,
): Business[] {
  const sorted = [...businesses];

  sorted.sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }

    if (sort === "callable") {
      // Working a cold-call list top-down, the best firm you can actually ring
      // right now belongs first. A firm with no number is not callable yet, so
      // it sinks below one you could pick the phone up to yet rate lower.
      const aCallable = a.phone || a.mobile ? 1 : 0;
      const bCallable = b.phone || b.mobile ? 1 : 0;

      return (
        bCallable - aCallable ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        a.name.localeCompare(b.name)
      );
    }

    if (sort === "followUp") {
      // Records with no follow-up date sink to the bottom rather than sorting
      // as if they were due first.
      if (!a.follow_up && !b.follow_up) {
        return a.name.localeCompare(b.name);
      }

      if (!a.follow_up) {
        return 1;
      }

      if (!b.follow_up) {
        return -1;
      }

      return a.follow_up.localeCompare(b.follow_up);
    }

    return (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name);
  });

  return sorted;
}

export type BoardStats = {
  total: number;
  toContact: number;
  due: number;
  overdue: number;
  quoting: number;
  won: number;
};

export function getBoardStats(
  businesses: Business[],
  today: string = todayIso(),
): BoardStats {
  const countStatus = (status: BusinessPipelineStatus) =>
    businesses.filter((business) => business.pipeline_status === status).length;

  return {
    total: businesses.length,
    toContact: countStatus("prospect"),
    due: businesses.filter((business) => isDue(business, today)).length,
    overdue: businesses.filter(
      (business) => getFollowUpState(business, today) === "overdue",
    ).length,
    quoting: countStatus("quoting"),
    won: countStatus("won"),
  };
}

// A Companies House number is eight characters: eight digits, or a two-letter
// prefix and six digits (SC058445, NI123456, OC123456).
const COMPANY_NUMBER = /^([A-Z]{2}\d{6}|\d{8})\b/i;

export type SplitCompanyNumber = { number: string | null; note: string };

// The standalone board let you type anything into the company-number box, and
// some records hold a reminder instead ("Verify on CH before call") or a number
// with a comment after it. That field is the dedup key here, so keep only a
// real number and carry the rest across as a note.
export function splitCompanyNumber(value: string): SplitCompanyNumber {
  const trimmed = value.trim();
  const match = COMPANY_NUMBER.exec(trimmed);

  if (!match) {
    return { number: null, note: trimmed };
  }

  return {
    number: match[1].toUpperCase(),
    note: trimmed.slice(match[1].length).trim(),
  };
}

function formatActivity(activity: ImportedActivity): string {
  const stamp = activity.ts.slice(0, 10);
  const label = activity.type || "Note";

  return [stamp, label, activity.note].filter(Boolean).join(" · ");
}

// Fold the standalone board's next-action line and activity log into the notes
// field. Nothing is dropped, and lines already present in the notes are not
// repeated. A proper activity timeline is Phase 4 work.
export function composeImportNotes(
  record: ImportedProspect,
  extraLines: string[] = [],
): string {
  const lines: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const trimmed = line.trim();
    const key = trimmed.toLowerCase();

    if (trimmed === "" || seen.has(key)) {
      return;
    }

    seen.add(key);
    lines.push(trimmed);
  };

  for (const line of record.notes.split("\n")) {
    push(line);
  }

  if (record.nextActionText && !seen.has(record.nextActionText.toLowerCase())) {
    push(`Next action: ${record.nextActionText}`);
  }

  for (const activity of record.activities) {
    if (activity.note && seen.has(activity.note.toLowerCase())) {
      continue;
    }

    push(formatActivity(activity));
  }

  for (const line of extraLines) {
    push(line);
  }

  return lines.join("\n");
}

// Map a record from a standalone board backup onto the shared business spine.
export function importedProspectToBusinessInput(
  record: ImportedProspect,
): CreateBusinessInput {
  const companyNumber = splitCompanyNumber(record.companyNumber);
  const notes = composeImportNotes(
    record,
    companyNumber.note ? [`Company number: ${companyNumber.note}`] : [],
  );

  return {
    name: record.name,
    company_number: companyNumber.number,
    company_status: record.companyStatus || null,
    incorporated: record.incorporated || null,
    location: record.location || null,
    address: record.address || null,
    directors: record.directors.filter((director) => director.name !== ""),
    phone: record.phone || null,
    mobile: record.mobile || null,
    email: record.email || null,
    website: record.website || null,
    franchise: record.franchise || null,
    services: record.services || null,
    profile: record.profile || null,
    opportunity: record.opportunity || null,
    approach_angle: record.approachAngle || null,
    rating: record.rating,
    pipeline_status: mapLegacyPipelineStatus(record.pipelineStatus),
    follow_up: /^\d{4}-\d{2}-\d{2}$/.test(record.followUp)
      ? record.followUp
      : null,
    notes: notes || null,
    source: "import",
  };
}
