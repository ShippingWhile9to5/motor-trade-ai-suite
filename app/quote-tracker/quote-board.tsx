"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createQuoteAction,
  deleteQuoteAction,
  updateQuoteAction,
} from "../actions/quotes";
import {
  QUOTE_INSURERS,
  QUOTE_STAGES,
  QUOTE_TYPES,
  STAGE_ACTIONS,
  STAGE_LABELS,
  getDaysInStage,
  getUrgency,
  type UrgencyLevel,
} from "../../lib/quote-tracker";
import type {
  QuoteOutcome,
  QuoteWithClient,
} from "../../lib/schemas/quote";

type QuoteBoardProps = {
  quotes: QuoteWithClient[];
  loadError: boolean;
};

const OUTCOMES: QuoteOutcome[] = ["Won", "Lost", "NTU"];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

const emptyForm = {
  client_name: "",
  insurer: "",
  quote_type: "New Business",
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
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<Key extends keyof typeof form>(key: Key, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createQuoteAction({
          client_name: form.client_name,
          insurer: form.insurer,
          quote_type: form.quote_type,
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

  const canSubmit =
    form.client_name.trim() !== "" &&
    form.insurer !== "" &&
    form.submission_date !== "";

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Add a quote
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Client name
          </span>
          <input
            type="text"
            value={form.client_name}
            placeholder="e.g. Brookway Cars Ltd"
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("client_name", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Insurer
          </span>
          <select
            value={form.insurer}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => update("insurer", event.target.value)}
          >
            <option value="">Select insurer</option>
            {QUOTE_INSURERS.map((insurer) => (
              <option key={insurer} value={insurer}>
                {insurer}
              </option>
            ))}
          </select>
        </label>
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
          className="min-h-11 rounded-md border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? "Adding..." : "Add quote"}
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

function QuoteCard({
  quote,
  onChanged,
}: {
  quote: QuoteWithClient;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [quoted, setQuoted] = useState(
    quote.quoted_premium == null ? "" : String(quote.quoted_premium),
  );
  const [commission, setCommission] = useState(
    quote.commission == null ? "" : String(quote.commission),
  );
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

  function commitQuoted() {
    const current = quote.quoted_premium == null ? "" : String(quote.quoted_premium);

    if (quoted.trim() === current) {
      return;
    }

    run(() => updateQuoteAction({ id: quote.id, quoted_premium: quoted }));
  }

  function commitCommission() {
    const current = quote.commission == null ? "" : String(quote.commission);

    if (commission.trim() === current) {
      return;
    }

    run(() => updateQuoteAction({ id: quote.id, commission }));
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {quote.client_name}
          </p>
          <p className="text-xs text-slate-500">
            {quote.insurer} · {quote.quote_type}
          </p>
        </div>
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
      </div>

      {quote.target_premium != null ? (
        <p className="mt-2 text-xs text-slate-600">
          Target £{quote.target_premium.toFixed(2)}
        </p>
      ) : null}

      <div className="mt-2">
        <label className="block">
          <span className="block text-xs text-slate-600">Quoted £</span>
          <input
            type="number"
            value={quoted}
            placeholder="0.00"
            disabled={isPending}
            className="mt-1 min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
            onChange={(event) => setQuoted(event.target.value)}
            onBlur={commitQuoted}
          />
        </label>
        {reducedFrom != null ? (
          <p
            className="mt-1 text-xs text-emerald-700"
            title="What the insurer first quoted"
          >
            was £{reducedFrom.toFixed(2)}
          </p>
        ) : null}
      </div>

      {/* Commission is typed in by hand, so it is asked for at the moment the
          deal is won rather than left to be remembered later. */}
      {quote.outcome === "Won" ? (
        <label className="mt-2 block">
          <span className="block text-xs text-slate-600">Commission £</span>
          <input
            type="number"
            value={commission}
            placeholder="0.00"
            disabled={isPending}
            className={`mt-1 min-h-9 w-full rounded-md border bg-white px-2 py-1 text-xs text-slate-950 ${
              quote.commission == null
                ? "border-amber-400"
                : "border-slate-300"
            }`}
            onChange={(event) => setCommission(event.target.value)}
            onBlur={commitCommission}
          />
        </label>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">
        {quote.outcome
          ? "Closed"
          : `${days} day${days === 1 ? "" : "s"} in stage`}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={quote.stage}
          disabled={isPending}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
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

        <select
          value={quote.outcome ?? ""}
          disabled={isPending}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
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

        <button
          type="button"
          disabled={isPending}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => run(() => deleteQuoteAction({ id: quote.id }))}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function QuoteBoard({ quotes, loadError }: QuoteBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  const actionable = quotes.filter(
    (quote) =>
      getUrgency(quote.stage, quote.stage_entered_at, quote.outcome) !== "none",
  );

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          Back to home
        </Link>
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

      <AddQuoteForm onCreated={refresh} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {QUOTE_STAGES.map((stage) => {
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
                  stageQuotes.map((quote) => (
                    <QuoteCard
                      // Remount on save so the premium box reflects what was
                      // actually stored.
                      key={`${quote.id}:${quote.updated_at}`}
                      quote={quote}
                      onChanged={refresh}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
