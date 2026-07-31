"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createQuotesAction,
  deleteQuoteAction,
  updateQuoteAction,
} from "../actions/quotes";
import {
  CLOSED_STAGE,
  POLICY_TYPES,
  QUOTE_INSURERS,
  QUOTE_STAGES,
  QUOTE_TYPES,
  STAGE_ACTIONS,
  STAGE_LABELS,
  type SubmissionGroup,
  getDaysInStage,
  getUrgency,
  groupBySubmission,
  type UrgencyLevel,
} from "../../lib/quote-tracker";
import { PolicyTypeField } from "../policy-type-field";
import { formatMoney } from "../../lib/reporting";
import type {
  QuoteOutcome,
  QuoteWithClient,
} from "../../lib/schemas/quote";
import type { Business } from "../../lib/schemas/business";

type QuoteBoardProps = {
  quotes: QuoteWithClient[];
  businesses: Business[];
  preselectBusinessId: string | null;
  loadError: boolean;
};

// Sentinel for the "not on my board yet" option in the client picker.
const NEW_CLIENT = "__new__";
// Same idea for the product: the list covers the book, not every cover there is.
const OTHER_POLICY = "__other_policy__";

const OUTCOMES: QuoteOutcome[] = ["Won", "Lost", "NTU"];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

const emptyForm = {
  business_id: "",
  client_name: "",
  insurers: [] as string[],
  other_insurer: "",
  quote_type: "New Business",
  policy_type: "Motor Trade Combined",
  other_policy_type: "",
  submission_date: todayIso(),
  target_premium: "",
  notes: "",
};

const urgencyDot: Record<UrgencyLevel, string> = {
  none: "bg-slate-300",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function AddQuoteForm({
  businesses,
  preselectBusinessId,
  onCreated,
}: {
  businesses: Business[];
  preselectBusinessId: string | null;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    business_id: preselectBusinessId ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sorted = [...businesses].sort((a, b) => a.name.localeCompare(b.name));
  const addingNew = form.business_id === NEW_CLIENT;
  const otherPolicy = form.policy_type === OTHER_POLICY;
  const policyName = otherPolicy
    ? form.other_policy_type.trim()
    : form.policy_type;
  // The typed-in insurer counts as picked without a second click, so filling
  // the box and pressing Add cannot silently drop it.
  const typedInsurer = form.other_insurer.trim();
  const insurers = typedInsurer
    ? [...form.insurers, typedInsurer]
    : form.insurers;

  function update<Key extends keyof typeof form>(key: Key, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleInsurer(insurer: string) {
    setForm((current) => ({
      ...current,
      insurers: current.insurers.includes(insurer)
        ? current.insurers.filter((name) => name !== insurer)
        : [...current.insurers, insurer],
    }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createQuotesAction({
          business_id: addingNew ? "" : form.business_id,
          client_name: addingNew ? form.client_name : "",
          insurers,
          quote_type: form.quote_type,
          policy_type: policyName,
          submission_date: form.submission_date,
          target_premium: form.target_premium,
          notes: form.notes,
        });
        setForm({ ...emptyForm, submission_date: todayIso() });
        onCreated();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not add the quote.",
        );
      }
    });
  }

  const hasClient = addingNew
    ? form.client_name.trim() !== ""
    : form.business_id !== "";
  const canSubmit =
    hasClient && insurers.length > 0 && form.submission_date !== "";

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Add a quote
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Client
          </span>
          {/* Picked by id, so a firm already on the board can't be duplicated
              by a near-miss spelling. */}
          <select
            value={form.business_id}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("business_id", event.target.value)}
          >
            <option value="">Select a client</option>
            {sorted.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
            <option value={NEW_CLIENT}>+ Not on my board yet</option>
          </select>
          {addingNew ? (
            <input
              type="text"
              autoFocus
              value={form.client_name}
              placeholder="e.g. Brookway Cars Ltd"
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) => update("client_name", event.target.value)}
            />
          ) : null}
        </label>
        {/* A risk goes out to several insurers at once, so this is a pick-many
            rather than a dropdown. Each one gets its own card. */}
        <fieldset className="block md:col-span-2 lg:col-span-3">
          <legend className="text-sm font-medium text-slate-950">
            Insurers ({insurers.length} selected)
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUOTE_INSURERS.map((insurer) => {
              const picked = form.insurers.includes(insurer);

              return (
                <button
                  key={insurer}
                  type="button"
                  aria-pressed={picked}
                  className={`min-h-11 rounded-md border px-3 py-2 text-sm ${
                    picked
                      ? "border-brand-700 bg-brand-700 font-medium text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => toggleInsurer(insurer)}
                >
                  {insurer}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={form.other_insurer}
            placeholder="Another insurer not listed"
            aria-label="Another insurer not listed"
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("other_insurer", event.target.value)}
          />
        </fieldset>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Quote type
          </span>
          <select
            value={form.quote_type}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("quote_type", event.target.value)}
          >
            {QUOTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Policy type
          </span>
          {/* The product, which is what the commission return reports on. */}
          <select
            value={form.policy_type}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("policy_type", event.target.value)}
          >
            {POLICY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value={OTHER_POLICY}>+ Other cover</option>
          </select>
          {otherPolicy ? (
            <input
              type="text"
              autoFocus
              value={form.other_policy_type}
              placeholder="e.g. Cyber"
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) =>
                update("other_policy_type", event.target.value)
              }
            />
          ) : null}
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Submission date
          </span>
          <input
            type="date"
            value={form.submission_date}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("submission_date", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Target premium (£, optional)
          </span>
          <input
            type="number"
            value={form.target_premium}
            placeholder="0.00"
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("target_premium", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Notes (optional)
          </span>
          <input
            type="text"
            value={form.notes}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("notes", event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4">
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending
            ? "Adding..."
            : `Add quote${insurers.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

const outcomeBadge: Record<QuoteOutcome, string> = {
  Won: "bg-emerald-100 text-emerald-700",
  Lost: "bg-slate-200 text-slate-600",
  NTU: "bg-slate-200 text-slate-600",
};

// The typed-in fields, held as a draft so several can be corrected in one
// visit and written together.
type Draft = { quoted: string; commission: string; policyType: string };

function draftOf(quote: QuoteWithClient): Draft {
  return {
    quoted: quote.quoted_premium == null ? "" : String(quote.quoted_premium),
    commission: quote.commission == null ? "" : String(quote.commission),
    policyType: quote.policy_type ?? "",
  };
}

// Only what was actually changed is sent, so a field left alone is never
// written back over.
function pendingChanges(
  draft: Draft,
  stored: Draft,
  isWon: boolean,
): Record<string, string | null> {
  const changes: Record<string, string | null> = {};

  if (draft.quoted.trim() !== stored.quoted) {
    changes.quoted_premium = draft.quoted;
  }

  if (isWon && draft.commission.trim() !== stored.commission) {
    changes.commission = draft.commission;
  }

  if (draft.policyType !== stored.policyType) {
    changes.policy_type = draft.policyType || null;
  }

  return changes;
}

function QuoteCard({
  quote,
  onChanged,
}: {
  quote: QuoteWithClient;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(() => draftOf(quote));
  const [savedAt, setSavedAt] = useState(quote.updated_at);
  const [armed, setArmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stored = draftOf(quote);
  const changes = pendingChanges(draft, stored, quote.outcome === "Won");
  const dirty = Object.keys(changes).length > 0;

  // The row has been written since these boxes were filled in, so they go back
  // to what was actually stored — while the card stays open where it is.
  // Unsaved typing is left alone: a stage or outcome change mid-edit must not
  // quietly throw away a figure that has not been saved yet.
  if (savedAt !== quote.updated_at) {
    setSavedAt(quote.updated_at);

    if (!dirty) {
      setDraft(stored);
    }
  }
  const urgency = getUrgency(quote.stage, quote.stage_entered_at, quote.outcome);
  const days = getDaysInStage(quote.stage_entered_at);
  // Only worth showing once a negotiation has actually moved the price.
  const reducedFrom =
    quote.initial_quoted_premium != null &&
    quote.quoted_premium != null &&
    quote.initial_quoted_premium !== quote.quoted_premium
      ? quote.initial_quoted_premium
      : null;

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onChanged();
    });
  }

  function update(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveChanges() {
    if (!dirty) {
      return;
    }

    run(() => updateQuoteAction({ id: quote.id, ...changes }));
  }

  // Collapsed, a card is a name, where it stands and how long it has stood
  // there — enough to scan a column. The rest is one click away.
  const price = quote.quoted_premium ?? quote.target_premium;

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-card">
      <div className="px-3 py-2.5">
        <button
          type="button"
          className="flex w-full items-start gap-2 text-left"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-950">
              {quote.client_name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {quote.insurer}
              {price != null ? ` · ${formatMoney(price)}` : ""}
              {quote.outcome ? "" : ` · ${days}d`}
            </span>
          </span>
          {quote.outcome ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${outcomeBadge[quote.outcome]}`}
            >
              {quote.outcome}
            </span>
          ) : (
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${urgencyDot[urgency]}`}
              title={
                urgency === "none"
                  ? "On track"
                  : `${STAGE_ACTIONS[quote.stage]} — ${days} day${days === 1 ? "" : "s"} in stage`
              }
            />
          )}
        </button>

        {/* Moving a stage is the most common thing you do here, so it stays
            out of the fold. */}
        <select
          value={quote.stage}
          disabled={isPending}
          aria-label={`Stage for ${quote.client_name}`}
          className="mt-2 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
          onChange={(event) =>
            run(() =>
              updateQuoteAction({ id: quote.id, stage: Number(event.target.value) }),
            )
          }
        >
          {QUOTE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-3 py-3">
          <p className="text-xs text-slate-500">
            {quote.quote_type}
            {quote.target_premium != null
              ? ` · target ${formatMoney(quote.target_premium)}`
              : ""}
          </p>

          <label className="mt-2 block">
            <span className="block text-xs text-slate-600">Quoted £</span>
            <input
              type="number"
              value={draft.quoted}
              placeholder="0.00"
              disabled={isPending}
              className="mt-1 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
              onChange={(event) => update("quoted", event.target.value)}
            />
          </label>
          {reducedFrom != null ? (
            <p
              className="mt-1 text-xs text-emerald-700"
              title="What the insurer first quoted"
            >
              was {formatMoney(reducedFrom)}
            </p>
          ) : null}

          {/* Commission is typed in by hand, so it is asked for at the moment
              the deal is won rather than left to be remembered later. */}
          {quote.outcome === "Won" ? (
            <label className="mt-2 block">
              <span className="block text-xs text-slate-600">Commission £</span>
              <input
                type="number"
                value={draft.commission}
                placeholder="0.00"
                disabled={isPending}
                className={`mt-1 min-h-9 w-full rounded-md border bg-white px-2 py-1 text-xs text-slate-950 ${
                  quote.commission == null
                    ? "border-amber-400"
                    : "border-slate-300"
                }`}
                onChange={(event) => update("commission", event.target.value)}
              />
            </label>
          ) : null}

          {/* The product, which the commission return reports on. Editable
              here because it is set once at submission and easily missed. */}
          <label className="mt-2 block">
            <span className="block text-xs text-slate-600">Policy type</span>
            <PolicyTypeField
              value={draft.policyType}
              disabled={isPending}
              label={`Policy type for ${quote.client_name}`}
              className={`mt-1 min-h-9 w-full rounded-md border bg-white px-2 py-1 text-xs text-slate-950 ${
                draft.policyType === "" ? "border-amber-400" : "border-slate-300"
              }`}
              onSave={(next) => update("policyType", next)}
            />
          </label>

          {/* Typed-in figures are saved together, so coming back to a closed
              quote to correct two numbers is one visit, not two. */}
          <button
            type="button"
            disabled={!dirty || isPending}
            className="mt-3 min-h-9 w-full rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:bg-slate-100 disabled:text-slate-400"
            onClick={saveChanges}
          >
            {isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>

          <select
            value={quote.outcome ?? ""}
            disabled={isPending}
            aria-label={`Outcome for ${quote.client_name}`}
            className="mt-2 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
            onChange={(event) =>
              run(() =>
                updateQuoteAction({
                  id: quote.id,
                  outcome: event.target.value === "" ? null : event.target.value,
                }),
              )
            }
          >
            <option value="">Outcome…</option>
            {OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>

          {/* Armed first: a quote carries its premium history and commission,
              and there is no undo. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {armed ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  className="min-h-9 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={() => run(() => deleteQuoteAction({ id: quote.id }))}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => setArmed(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isPending}
                className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:border-red-300 hover:text-red-700 disabled:opacity-60"
                onClick={() => setArmed(true)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Several insurers of the same submission sitting in the same stage. They
// stack under one heading so the day a risk goes out reads as one line per
// client rather than one per insurer — the worst flag among them shows on the
// heading, so nothing needing a chase can hide inside a collapsed stack.
function SubmissionStack({
  group,
  onChanged,
}: {
  group: SubmissionGroup<QuoteWithClient>;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const urgencies = group.quotes.map((quote) =>
    getUrgency(quote.stage, quote.stage_entered_at, quote.outcome),
  );
  const worst: UrgencyLevel = urgencies.includes("red")
    ? "red"
    : urgencies.includes("amber")
      ? "amber"
      : "none";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-950">
            {group.clientName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {group.quotes.length} insurers ·{" "}
            {group.quotes.map((quote) => quote.insurer).join(", ")}
          </span>
        </span>
        {worst === "none" ? null : (
          <span
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${urgencyDot[worst]}`}
            title="One of these needs chasing"
          />
        )}
      </button>

      {open ? (
        <div className="flex flex-col gap-2 px-2 pb-2">
          {group.quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} onChanged={onChanged} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function QuoteBoard({
  quotes,
  businesses,
  preselectBusinessId,
  loadError,
}: QuoteBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showClosed, setShowClosed] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  const actionable = quotes.filter(
    (quote) =>
      getUrgency(quote.stage, quote.stage_entered_at, quote.outcome) !== "none",
  );
  const closedCount = quotes.filter(
    (quote) => quote.stage === CLOSED_STAGE,
  ).length;
  const visibleStages = showClosed
    ? QUOTE_STAGES
    : QUOTE_STAGES.filter((stage) => stage !== CLOSED_STAGE);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
            Quote Tracker
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Track every quote from submission to close. Cards turn amber then
            red when a quote has been sitting in a stage that needs your action.
          </p>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load quotes. If this is the first run, the database may not
          be set up yet.
        </div>
      ) : null}

      {actionable.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {actionable.length} quote{actionable.length === 1 ? "" : "s"} need
          {actionable.length === 1 ? "s" : ""} chasing.
        </div>
      ) : null}

      <AddQuoteForm
        businesses={businesses}
        preselectBusinessId={preselectBusinessId}
        onCreated={refresh}
      />

      {/* Closed quotes need no attention, so the column is out of the way by
          default and the live stages get the width back. */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {quotes.length} quote{quotes.length === 1 ? "" : "s"} on the board
        </p>
        <button
          type="button"
          className="min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => setShowClosed((open) => !open)}
        >
          {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
        </button>
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          showClosed ? "xl:grid-cols-6" : "xl:grid-cols-5"
        }`}
      >
        {visibleStages.map((stage) => {
          const stageQuotes = quotes.filter((quote) => quote.stage === stage);

          return (
            <div key={stage} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">
                  {STAGE_LABELS[stage]}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {stageQuotes.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {stageQuotes.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    Nothing here
                  </p>
                ) : (
                  groupBySubmission(stageQuotes).map((group) =>
                    group.quotes.length === 1 ? (
                      <QuoteCard
                        // Keyed by id alone: a save must not remount the card,
                        // or it would snap shut mid-edit. The card refills its
                        // own boxes from the saved row instead.
                        key={group.quotes[0].id}
                        quote={group.quotes[0]}
                        onChanged={refresh}
                      />
                    ) : (
                      <SubmissionStack
                        key={group.key}
                        group={group}
                        onChanged={refresh}
                      />
                    ),
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
