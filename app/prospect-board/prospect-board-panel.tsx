"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBusinessAction,
  deleteBusinessAction,
  importProspectsAction,
  recordCallAttemptAction,
  updateBusinessAction,
} from "../actions/businesses";
import { updateQuoteAction } from "../actions/quotes";
import { PolicyTypeField } from "../policy-type-field";
import {
  BOARD_VIEWS,
  type BoardSort,
  type BoardView,
  DEFAULT_SORT_FOR_VIEW,
  describeAttempts,
  type FollowUpState,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  filterByView,
  getFollowUpState,
  searchBusinesses,
  sortBusinesses,
  todayIso,
} from "../../lib/prospect-board";
import type {
  Business,
  BusinessPipelineStatus,
} from "../../lib/schemas/business";
import type { QuoteWithClient } from "../../lib/schemas/quote";
import {
  formatMoney,
  quarterKey,
  quarterLabel,
  quarterOf,
  quarterlyTotals,
  sumWon,
} from "../../lib/reporting";
import {
  COMMISSION_COLUMNS,
  type CommissionRow,
  commissionRowsForQuarter,
  commissionTotals,
  formatCommissionMoney,
  formatCommissionTsv,
  quartersWithWins,
} from "../../lib/commission";

type ProspectBoardPanelProps = {
  businesses: Business[];
  quotes: QuoteWithClient[];
  loadError: boolean;
};

// Won and lost firms are still prospects that reached the end, so they live
// here rather than in a separate tool — just not mixed into the working list.
type BoardTab = "pipeline" | "won" | "lost" | "commission";

// The quarterly return that goes to the manager. Column for column this is the
// spreadsheet it replaces, so what comes out pastes back into it.
function CommissionReport({
  quotes,
  onChanged,
}: {
  quotes: QuoteWithClient[];
  onChanged: () => void;
}) {
  const today = todayIso();
  const current = quarterOf(today) ?? { year: 2026, quarter: 1 as const };
  const quarters = useMemo(
    () => quartersWithWins(quotes, current),
    [quotes, current.year, current.quarter],
  );
  const [selected, setSelected] = useState(quarterKey(current));
  const [copied, setCopied] = useState(false);

  const quarter =
    quarters.find((period) => quarterKey(period) === selected) ?? current;
  const rows = useMemo(
    () => commissionRowsForQuarter(quotes, quarter),
    [quotes, quarter.year, quarter.quarter],
  );
  const totals = useMemo(() => commissionTotals(rows), [rows]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCommissionTsv(rows, quarter));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={selected}
            aria-label="Quarter"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => setSelected(event.target.value)}
          >
            {quarters.map((period) => (
              <option key={quarterKey(period)} value={quarterKey(period)}>
                {quarterLabel(period)}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            {rows.length} won deal{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          disabled={rows.length === 0}
          className="min-h-11 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          onClick={copy}
        >
          {copied ? "Copied — paste into Excel" : "Copy for Excel"}
        </button>
      </div>

      {totals.missingCommission > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {totals.missingCommission} won deal
          {totals.missingCommission === 1 ? " has" : "s have"} no commission
          recorded, so this return is short until you fill them in.
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Nothing won in {quarterLabel(quarter)} yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                {COMMISSION_COLUMNS.map((column, index) => (
                  <th
                    key={column}
                    className={`px-4 py-3 font-medium ${index >= 3 ? "text-right" : ""}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CommissionRowView
                  key={row.quoteId}
                  row={row}
                  onChanged={onChanged}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold text-slate-950">
                <td className="px-4 py-3" colSpan={3}>
                  Total {quarterLabel(quarter)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(totals.grossPremium)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(totals.commissionIncome)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(totals.feeIncome)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(totals.totalIncome)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {formatMoney(totals.share)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function CommissionRowView({
  row,
  onChanged,
}: {
  row: CommissionRow;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [fee, setFee] = useState(
    row.feeIncome == null ? "" : String(row.feeIncome),
  );
  const [commission, setCommission] = useState(
    row.commissionIncome == null ? "" : String(row.commissionIncome),
  );

  function save(changes: Record<string, unknown>) {
    startTransition(async () => {
      await updateQuoteAction({ id: row.quoteId, ...changes });
      onChanged();
    });
  }

  const cell =
    "min-h-9 w-24 rounded-md border bg-white px-2 py-1 text-right text-sm text-slate-950";

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-950">
        {row.policyholder}
      </td>
      {/* Set once when the quote was raised, so it is fixable here — this is
          the column the return is wrong in, on the screen it is read from. */}
      <td className="px-4 py-3 text-slate-600">
        <PolicyTypeField
          value={row.policyType}
          disabled={isPending}
          label={`Policy type for ${row.policyholder}`}
          className={`min-h-9 w-44 rounded-md border bg-white px-2 py-1 text-sm text-slate-950 ${
            row.policyType === "" ? "border-amber-400" : "border-slate-300"
          }`}
          onSave={(policy_type) => save({ policy_type: policy_type || null })}
        />
      </td>
      <td className="px-4 py-3 text-slate-600">{row.insurer}</td>
      <td className="px-4 py-3 text-right text-slate-600">
        {formatCommissionMoney(row.grossPremium)}
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="number"
          value={commission}
          placeholder="0.00"
          disabled={isPending}
          aria-label={`Commission income for ${row.policyholder}`}
          className={`${cell} ${row.commissionIncome == null ? "border-amber-400" : "border-slate-300"}`}
          onChange={(event) => setCommission(event.target.value)}
          onBlur={() => {
            const current =
              row.commissionIncome == null ? "" : String(row.commissionIncome);

            if (commission.trim() !== current) {
              save({ commission });
            }
          }}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="number"
          value={fee}
          placeholder="0.00"
          disabled={isPending}
          aria-label={`Fee income for ${row.policyholder}`}
          className={`${cell} border-slate-300`}
          onChange={(event) => setFee(event.target.value)}
          onBlur={() => {
            const current = row.feeIncome == null ? "" : String(row.feeIncome);

            if (fee.trim() !== current) {
              save({ fee });
            }
          }}
        />
      </td>
      <td className="px-4 py-3 text-right text-slate-600">
        {formatMoney(row.totalIncome)}
      </td>
      <td className="px-4 py-3 text-right font-medium text-emerald-700">
        {formatMoney(row.share)}
      </td>
    </tr>
  );
}

const statusPill: Record<BusinessPipelineStatus, string> = {
  prospect: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  quoting: "bg-amber-100 text-amber-800",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-200 text-slate-500",
};

const followUpBadge: Record<
  Exclude<FollowUpState, "none">,
  { label: string; className: string }
> = {
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  due: { label: "Due today", className: "bg-amber-100 text-amber-800" },
  upcoming: { label: "", className: "" },
};

function RatingGauge({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (rating: number) => void;
}) {
  const filled = value ?? 0;

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rating ${filled} of 5`}
    >
      {[1, 2, 3, 4, 5].map((step) =>
        onChange ? (
          <button
            key={step}
            type="button"
            aria-label={`Set rating ${step}`}
            className={`h-3.5 w-3.5 rounded-sm ${
              step <= filled ? "bg-slate-900" : "bg-slate-200"
            }`}
            onClick={() => onChange(step)}
          />
        ) : (
          <span
            key={step}
            className={`h-2 w-2 rounded-sm ${
              step <= filled ? "bg-slate-900" : "bg-slate-200"
            }`}
          />
        ),
      )}
    </span>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

const emptyAdd = {
  name: "",
  phone: "",
  location: "",
  company_number: "",
  follow_up: "",
  notes: "",
  pipeline_status: "prospect" as BusinessPipelineStatus,
  rating: 3,
};

// The cold-call entry point: a short form with only what you can get on the
// phone. Everything else is editable on the card afterwards.
function AddProspectForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(emptyAdd);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const outcome = await createBusinessAction({ ...form, source: "manual" });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      setForm(emptyAdd);
      onDone();
    });
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Add a prospect
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Only the name is required — add the rest later.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Business name">
          <input
            type="text"
            autoFocus
            value={form.name}
            placeholder="e.g. Liverpool MOT Centre"
            className={inputClass}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={form.phone}
            placeholder="0151 000 0000"
            className={inputClass}
            onChange={(event) => update("phone", event.target.value)}
          />
        </Field>
        <Field label="Town">
          <input
            type="text"
            value={form.location}
            placeholder="Liverpool"
            className={inputClass}
            onChange={(event) => update("location", event.target.value)}
          />
        </Field>
        <Field label="Call back on">
          <input
            type="date"
            value={form.follow_up}
            className={inputClass}
            onChange={(event) => update("follow_up", event.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.pipeline_status}
            className={inputClass}
            onChange={(event) =>
              update(
                "pipeline_status",
                event.target.value as BusinessPipelineStatus,
              )
            }
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PIPELINE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Company number">
          <input
            type="text"
            value={form.company_number}
            placeholder="Optional"
            className={inputClass}
            onChange={(event) => update("company_number", event.target.value)}
          />
        </Field>
        <Field label="Notes" wide>
          <textarea
            rows={2}
            value={form.notes}
            placeholder="What was said on the call"
            className={`${inputClass} min-h-[64px]`}
            onChange={(event) => update("notes", event.target.value)}
          />
        </Field>
        <Field label="Rating">
          <span className="mt-3 flex items-center gap-2">
            <RatingGauge
              value={form.rating}
              onChange={(rating) => update("rating", rating)}
            />
            <span className="text-xs text-slate-500">{form.rating} of 5</span>
          </span>
        </Field>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isPending || form.name.trim() === ""}
        >
          {isPending ? "Saving..." : "Save prospect"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// The keys the importer reads, as a prompt-ready spec. Anything else in the
// JSON is ignored rather than rejected, so a near-miss shape still imports.
const FORMAT_SPEC = `Return the prospects as a JSON array in exactly this shape. Only "name" is required; omit any field you cannot find rather than guessing.

[
  {
    "name": "Liverpool MOT Centre Ltd",
    "companyNumber": "09876543",
    "location": "Liverpool",
    "address": "Unit 4 Dock Road, Liverpool, L3 4AA",
    "phone": "0151 000 0000",
    "email": "info@example.co.uk",
    "website": "example.co.uk",
    "franchise": "Independent",
    "services": "MOT, servicing, used sales",
    "profile": "What the firm does and how big it is.",
    "opportunity": "What you could quote them for.",
    "approachAngle": "A reason to ring them.",
    "rating": 4,
    "directors": [
      { "name": "Jane Smith", "role": "Director", "appointed": "2015" }
    ]
  }
]`;

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    setError(null);
    setMessage(null);

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      setError("That is not valid JSON.");
      return;
    }

    startTransition(async () => {
      const outcome = await importProspectsAction(parsed);

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      const { imported, skipped } = outcome.result;
      setMessage(
        `Imported ${imported.length} prospect${imported.length === 1 ? "" : "s"}` +
          (skipped.length > 0
            ? `, skipped ${skipped.length} already on the board.`
            : "."),
      );
      setText("");
      onDone();
    });
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Import prospects
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste a JSON list of firms — a batch you have had researched, or a
        backup from the old board. Only <code>name</code> is required;
        everything else is optional. Duplicates are matched on company number,
        then name, so importing twice is safe.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800">
          Show the format to ask for
        </summary>
        {/* Paste this straight into a research prompt so the JSON comes back
            in a shape the importer reads without editing. */}
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 px-3 py-3 font-mono text-xs leading-5 text-slate-700">
{`[
  {
    "name": "Liverpool MOT Centre Ltd",
    "companyNumber": "09876543",
    "location": "Liverpool",
    "address": "Unit 4 Dock Road, Liverpool, L3 4AA",
    "phone": "0151 000 0000",
    "email": "info@example.co.uk",
    "website": "example.co.uk",
    "franchise": "Independent",
    "services": "MOT, servicing, used sales",
    "profile": "What the firm does and how big it is.",
    "opportunity": "What you could quote them for.",
    "approachAngle": "A reason to ring them.",
    "rating": 4,
    "directors": [
      { "name": "Jane Smith", "role": "Director", "appointed": "2015" }
    ]
  }
]`}
        </pre>
        <button
          type="button"
          className="mt-2 min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => {
            void navigator.clipboard.writeText(FORMAT_SPEC);
            setCopiedFormat(true);
            window.setTimeout(() => setCopiedFormat(false), 2000);
          }}
        >
          {copiedFormat ? "Copied" : "Copy the format"}
        </button>
      </details>
      <textarea
        rows={5}
        value={text}
        placeholder='[ { "name": "…", "phone": "…" } ]'
        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-950"
        onChange={(event) => setText(event.target.value)}
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? (
        <p className="mt-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      <div className="mt-3">
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 disabled:opacity-60"
          onClick={handleImport}
          disabled={isPending || text.trim() === ""}
        >
          {isPending ? "Importing..." : "Import"}
        </button>
      </div>
    </div>
  );
}

function ProspectCard({
  business,
  quoteCount,
  expanded,
  onToggle,
  onChanged,
}: {
  business: Business;
  quoteCount: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(business);
  const [error, setError] = useState<string | null>(null);
  // The two quick controls on the collapsed row hold their own value so the
  // choice sticks immediately instead of snapping back to the old one while
  // the save is in flight.
  const [quickStatus, setQuickStatus] = useState(business.pipeline_status);
  const [quickFollowUp, setQuickFollowUp] = useState(business.follow_up ?? "");
  const followUp = getFollowUpState(business);
  const badge = followUp === "none" ? null : followUpBadge[followUp];

  function save(changes: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const outcome = await updateBusinessAction({ id: business.id, ...changes });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      onChanged();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const outcome = await deleteBusinessAction({ id: business.id });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      onChanged();
    });
  }

  function handleNoAnswer() {
    setError(null);
    startTransition(async () => {
      const outcome = await recordCallAttemptAction({ id: business.id });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      onChanged();
    });
  }

  function updateDraft<Key extends keyof Business>(
    key: Key,
    value: Business[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const summary = [business.location, business.phone ?? business.mobile]
    .filter(Boolean)
    .join(" · ");
  const attempts = describeAttempts(business);

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="text-sm font-semibold text-slate-950">
            {business.name}
          </span>
          <RatingGauge value={business.rating} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPill[business.pipeline_status]}`}
          >
            {PIPELINE_STATUS_LABELS[business.pipeline_status]}
          </span>
          {badge && badge.label ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : null}
          {summary ? (
            <span className="truncate text-xs text-slate-500">{summary}</span>
          ) : null}
          {attempts ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                business.attempts >= 4
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-500"
              }`}
              title={
                business.attempts >= 4
                  ? "Rung out repeatedly — worth checking the number or parking them"
                  : "Call attempts with no answer"
              }
            >
              {attempts}
            </span>
          ) : null}
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={quickStatus}
            disabled={isPending}
            aria-label={`Status for ${business.name}`}
            className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
            onChange={(event) => {
              const value = event.target.value as BusinessPipelineStatus;
              setQuickStatus(value);
              save({ pipeline_status: value });
            }}
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PIPELINE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={quickFollowUp}
            disabled={isPending}
            aria-label={`Follow-up date for ${business.name}`}
            className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
            onChange={(event) => {
              setQuickFollowUp(event.target.value);
              save({ follow_up: event.target.value });
            }}
          />
          {/* Rang out. Keeps them in the queue but moves them down it, so a
              calling session never doubles back on the same firm. */}
          <button
            type="button"
            disabled={isPending}
            className="min-h-9 shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            onClick={handleNoAnswer}
          >
            No answer
          </button>
          {/* Attaches the quote to this exact firm, so the Quote Tracker
              doesn't have to match a typed name. */}
          <Link
            href={`/quote-tracker?business=${business.id}`}
            className="min-h-9 shrink-0 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            Quote
          </Link>
          <DeleteButton
            size="small"
            disabled={isPending}
            quoteCount={quoteCount}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Business name">
              <input
                type="text"
                value={draft.name}
                className={inputClass}
                onChange={(event) => updateDraft("name", event.target.value)}
              />
            </Field>
            <Field label="Company number">
              <input
                type="text"
                value={draft.company_number ?? ""}
                className={inputClass}
                onChange={(event) =>
                  updateDraft("company_number", event.target.value)
                }
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={draft.phone ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
            </Field>
            <Field label="Mobile">
              <input
                type="tel"
                value={draft.mobile ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("mobile", event.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={draft.email ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("email", event.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                type="text"
                value={draft.website ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("website", event.target.value)}
              />
            </Field>
            <Field label="Town">
              <input
                type="text"
                value={draft.location ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("location", event.target.value)}
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={draft.address ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("address", event.target.value)}
              />
            </Field>
            <Field label="Franchise">
              <input
                type="text"
                value={draft.franchise ?? ""}
                className={inputClass}
                onChange={(event) =>
                  updateDraft("franchise", event.target.value)
                }
              />
            </Field>
            <Field label="Services">
              <input
                type="text"
                value={draft.services ?? ""}
                className={inputClass}
                onChange={(event) => updateDraft("services", event.target.value)}
              />
            </Field>
            <Field label="Rating">
              <span className="mt-3 flex items-center gap-2">
                <RatingGauge
                  value={draft.rating}
                  onChange={(rating) => updateDraft("rating", rating)}
                />
                <span className="text-xs text-slate-500">
                  {draft.rating ?? 0} of 5
                </span>
              </span>
            </Field>
            <Field label="Follow-up date">
              <input
                type="date"
                value={draft.follow_up ?? ""}
                className={inputClass}
                onChange={(event) =>
                  updateDraft("follow_up", event.target.value)
                }
              />
            </Field>
            <Field label="Profile" wide>
              <textarea
                rows={3}
                value={draft.profile ?? ""}
                className={`${inputClass} min-h-[72px]`}
                onChange={(event) => updateDraft("profile", event.target.value)}
              />
            </Field>
            <Field label="Opportunity" wide>
              <textarea
                rows={3}
                value={draft.opportunity ?? ""}
                className={`${inputClass} min-h-[72px]`}
                onChange={(event) =>
                  updateDraft("opportunity", event.target.value)
                }
              />
            </Field>
            <Field label="Approach angle" wide>
              <textarea
                rows={3}
                value={draft.approach_angle ?? ""}
                className={`${inputClass} min-h-[72px]`}
                onChange={(event) =>
                  updateDraft("approach_angle", event.target.value)
                }
              />
            </Field>
            <Field label="Notes" wide>
              <textarea
                rows={4}
                value={draft.notes ?? ""}
                className={`${inputClass} min-h-[96px]`}
                onChange={(event) => updateDraft("notes", event.target.value)}
              />
            </Field>
          </div>

          {draft.directors.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Directors
              </p>
              <ul className="mt-2 space-y-1">
                {draft.directors.map((director) => (
                  <li key={director.name} className="text-sm text-slate-700">
                    {[director.name, director.role, director.appointed]
                      .filter(Boolean)
                      .join(" — ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              className="min-h-11 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
              onClick={() =>
                save({
                  name: draft.name,
                  company_number: draft.company_number,
                  phone: draft.phone,
                  mobile: draft.mobile,
                  email: draft.email,
                  website: draft.website,
                  location: draft.location,
                  address: draft.address,
                  franchise: draft.franchise,
                  services: draft.services,
                  rating: draft.rating,
                  follow_up: draft.follow_up,
                  profile: draft.profile,
                  opportunity: draft.opportunity,
                  approach_angle: draft.approach_angle,
                  notes: draft.notes,
                })
              }
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
            <span className="text-xs text-slate-400">
              Added from {business.source}
            </span>
            <span className="ml-auto">
              <DeleteButton
                disabled={isPending}
                quoteCount={quoteCount}
                onConfirm={handleDelete}
              />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Deleting a business cascades to its quotes, so this arms first and says what
// else goes with it. There is no undo, and a won client carries its premium
// and commission history.
function DeleteButton({
  onConfirm,
  disabled,
  quoteCount,
  size = "normal",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  quoteCount: number;
  size?: "normal" | "small";
}) {
  const [armed, setArmed] = useState(false);
  const padding = size === "small" ? "px-2 py-1" : "px-3 py-2";
  const height = size === "small" ? "min-h-9" : "min-h-11";

  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`${height} shrink-0 rounded-md border border-slate-300 bg-white ${padding} text-xs text-slate-600 hover:border-red-300 hover:text-red-700 disabled:opacity-60`}
        onClick={() => setArmed(true)}
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs text-red-700">
        {quoteCount > 0
          ? `Delete this and its ${quoteCount} quote${quoteCount === 1 ? "" : "s"}?`
          : "Delete for good?"}
      </span>
      <button
        type="button"
        disabled={disabled}
        className={`${height} shrink-0 rounded-md bg-red-600 ${padding} text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60`}
        onClick={onConfirm}
      >
        Yes, delete
      </button>
      <button
        type="button"
        className={`${height} shrink-0 rounded-md border border-slate-300 bg-white ${padding} text-xs text-slate-600 hover:bg-slate-50`}
        onClick={() => setArmed(false)}
      >
        Cancel
      </button>
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        tone === "warn"
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold ${
          tone === "warn" ? "text-amber-900" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// Bar heights are worked out in pixels rather than percentages: a percentage
// height needs a parent with a definite height to resolve against, which a
// flex column sized to its content does not have.
const CHART_BAR_AREA = 112;

function QuarterChart({ quotes }: { quotes: QuoteWithClient[] }) {
  const series = quarterlyTotals(quotes);
  const peak = Math.max(...series.map((period) => period.commission), 0);

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Commission by quarter
      </p>
      <div className="mt-4 flex items-end gap-3">
        {series.map((period) => {
          // A quarter with earnings always shows a bar, so a small one never
          // looks identical to an empty one.
          const height =
            peak > 0 && period.commission > 0
              ? Math.max(Math.round((period.commission / peak) * CHART_BAR_AREA), 4)
              : 2;

          return (
            <div
              key={period.key}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${period.label}: ${formatMoney(period.commission)} from ${period.won} deal${period.won === 1 ? "" : "s"}`}
            >
              <span className="text-xs font-medium text-slate-600">
                {period.commission > 0 ? formatMoney(period.commission) : ""}
              </span>
              <div
                className={`w-full rounded-t ${
                  period.commission > 0 ? "bg-emerald-500" : "bg-slate-200"
                }`}
                style={{ height: `${height}px` }}
              />
              <span className="text-xs text-slate-500">{period.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClosedRow({
  business,
  quotes,
  outcomeLabel,
  onChanged,
}: {
  business: Business;
  quotes: QuoteWithClient[];
  outcomeLabel: "Won" | "Lost";
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const quote = quotes.find(
    (row) => row.business_id === business.id && row.outcome === outcomeLabel,
  );
  const quoteCount = quotes.filter(
    (row) => row.business_id === business.id,
  ).length;
  // Editable here as well as on the Quote Tracker: this is the tab you are
  // looking at when you reconcile the figures, so it is where you fix them.
  const [premium, setPremium] = useState(
    quote?.quoted_premium == null ? "" : String(quote.quoted_premium),
  );
  const [commission, setCommission] = useState(
    quote?.commission == null ? "" : String(quote.commission),
  );

  function saveQuote(changes: Record<string, unknown>) {
    if (!quote) {
      return;
    }

    setError(null);
    startTransition(async () => {
      await updateQuoteAction({ id: quote.id, ...changes });
      onChanged();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const outcome = await deleteBusinessAction({ id: business.id });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      onChanged();
    });
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-950">
        {business.name}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </td>
      <td className="px-4 py-3 text-slate-600">{quote?.insurer ?? "—"}</td>
      <td className="px-4 py-3 text-slate-600">
        {quote ? (
          <input
            type="number"
            value={premium}
            placeholder="0.00"
            disabled={isPending}
            aria-label={`Gross premium for ${business.name}`}
            className="min-h-9 w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-950"
            onChange={(event) => setPremium(event.target.value)}
            onBlur={() => {
              const current =
                quote.quoted_premium == null ? "" : String(quote.quoted_premium);

              if (premium.trim() !== current) {
                saveQuote({ quoted_premium: premium });
              }
            }}
          />
        ) : (
          "—"
        )}
      </td>
      {outcomeLabel === "Won" ? (
        <td className="px-4 py-3">
          {quote ? (
            <input
              type="number"
              value={commission}
              placeholder="0.00"
              disabled={isPending}
              aria-label={`Commission for ${business.name}`}
              className={`min-h-9 w-28 rounded-md border bg-white px-2 py-1 text-sm text-slate-950 ${
                quote.commission == null
                  ? "border-amber-400"
                  : "border-slate-300"
              }`}
              onChange={(event) => setCommission(event.target.value)}
              onBlur={() => {
                const current =
                  quote.commission == null ? "" : String(quote.commission);

                if (commission.trim() !== current) {
                  saveQuote({ commission });
                }
              }}
            />
          ) : (
            "—"
          )}
        </td>
      ) : null}
      <td className="px-4 py-3 text-slate-500">{quote?.closed_at ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {/* A won client comes round again at renewal, and that is a new
              quote on the same firm. */}
          <Link
            href={`/quote-tracker?business=${business.id}`}
            className="min-h-9 shrink-0 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
          >
            {outcomeLabel === "Won" ? "Renew" : "Re-quote"}
          </Link>
          <DeleteButton
            size="small"
            disabled={isPending}
            quoteCount={quoteCount}
            onConfirm={handleDelete}
          />
        </div>
      </td>
    </tr>
  );
}

function ClosedList({
  businesses,
  quotes,
  outcomeLabel,
  onChanged,
}: {
  businesses: Business[];
  quotes: QuoteWithClient[];
  outcomeLabel: "Won" | "Lost";
  onChanged: () => void;
}) {
  if (businesses.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        Nothing {outcomeLabel.toLowerCase()} yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Insurer</th>
            <th className="px-4 py-3 font-medium">Premium</th>
            {outcomeLabel === "Won" ? (
              <th className="px-4 py-3 font-medium">Commission</th>
            ) : null}
            <th className="px-4 py-3 font-medium">
              {outcomeLabel === "Won" ? "Won" : "Closed"}
            </th>
            <th className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...businesses]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((business) => (
            <ClosedRow
              key={business.id}
              business={business}
              quotes={quotes}
              outcomeLabel={outcomeLabel}
              onChanged={onChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProspectBoardPanel({
  businesses,
  quotes,
  loadError,
}: ProspectBoardPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<BoardTab>("pipeline");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<BoardView>("to-contact");
  // Each view opens in the sort that suits its job; changing view resets it,
  // and this dropdown overrides.
  const [sort, setSort] = useState<BoardSort>(
    DEFAULT_SORT_FOR_VIEW["to-contact"],
  );
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function changeView(next: BoardView) {
    setView(next);
    setSort(DEFAULT_SORT_FOR_VIEW[next]);
  }

  const today = todayIso();
  // Everything still in play — won and lost have their own tabs rather than
  // sitting at the bottom of what you are chasing.
  const live = useMemo(
    () =>
      businesses.filter(
        (business) =>
          business.pipeline_status !== "won" &&
          business.pipeline_status !== "lost",
      ),
    [businesses],
  );
  const closed = useMemo(
    () => ({
      won: businesses.filter((business) => business.pipeline_status === "won"),
      lost: businesses.filter((business) => business.pipeline_status === "lost"),
    }),
    [businesses],
  );
  const viewCounts = useMemo(
    () =>
      Object.fromEntries(
        BOARD_VIEWS.map(({ value }) => [
          value,
          filterByView(live, value, today).length,
        ]),
      ) as Record<BoardView, number>,
    [live, today],
  );
  const searching = search.trim() !== "";
  // A search looks across everything still live, whatever view you are in —
  // otherwise a firm you know exists comes back "no matches" because it sits
  // in a pile you are not looking at.
  const visible = useMemo(() => {
    const pool = searching
      ? searchBusinesses(live, search)
      : filterByView(live, view, today);

    return sortBusinesses(pool, sort);
  }, [live, search, searching, view, sort, today]);
  const noPhone = useMemo(
    () =>
      view === "to-contact" && !searching
        ? visible.filter((business) => !business.phone && !business.mobile)
            .length
        : 0,
    [visible, view, searching],
  );
  const wonTotals = useMemo(() => sumWon(quotes), [quotes]);
  // Deleting a business cascades to its quotes, so the confirm can say how
  // many go with it.
  const quoteCountsByBusiness = useMemo(() => {
    const counts = new Map<string, number>();

    for (const quote of quotes) {
      counts.set(quote.business_id, (counts.get(quote.business_id) ?? 0) + 1);
    }

    return counts;
  }, [quotes]);
  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
              Prospect Board
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Every firm you are working, from first cold call to won. Set a
              call-back date and the card flags itself when it falls due.
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            onClick={() => {
              setShowAdd((open) => !open);
              setShowImport(false);
            }}
          >
            {showAdd ? "Close" : "+ Add prospect"}
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load prospects. If this is the first run, the database may
          not be set up yet.
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ["pipeline", `Pipeline (${live.length})`],
            ["won", `Won (${closed.won.length})`],
            ["lost", `Lost (${closed.lost.length})`],
            ["commission", "Commission"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === value
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "commission" ? (
        <CommissionReport quotes={quotes} onChanged={refresh} />
      ) : null}

      {tab === "won" || tab === "lost" ? (
        <>
          {tab === "won" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Deals won" value={`${wonTotals.won}`} />
                <Stat label="Premium" value={formatMoney(wonTotals.premium)} />
                <Stat
                  label="Commission"
                  value={formatMoney(wonTotals.commission)}
                />
                {wonTotals.missingCommission > 0 ? (
                  <Stat
                    label="Missing commission"
                    value={`${wonTotals.missingCommission}`}
                    tone="warn"
                  />
                ) : null}
              </div>
              <QuarterChart quotes={quotes} />
            </>
          ) : null}
          <ClosedList
            businesses={closed[tab as "won" | "lost"]}
            quotes={quotes}
            outcomeLabel={tab === "won" ? "Won" : "Lost"}
            onChanged={refresh}
          />
        </>
      ) : null}

      {tab === "pipeline" ? (
        <>
      {/* Named views rather than raw filters: a list of everything answers no
          question you actually have. */}
      <div className="flex flex-wrap gap-2">
        {BOARD_VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={!searching && view === value}
            className={`min-h-9 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !searching && view === value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => {
              setSearch("");
              changeView(value);
            }}
          >
            {label}
            <span
              className={`ml-1.5 tabular-nums ${
                !searching && view === value
                  ? "text-white/70"
                  : "text-slate-400"
              }`}
            >
              {viewCounts[value]}
            </span>
          </button>
        ))}
      </div>

      {showAdd ? (
        <AddProspectForm
          onDone={() => {
            setShowAdd(false);
            refresh();
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          placeholder="Search name, town, director…"
          className="min-h-11 min-w-[14rem] flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={sort}
          aria-label="Sort prospects"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          onChange={(event) => setSort(event.target.value as BoardSort)}
        >
          <option value="callable">Sort: Best to ring</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="rating">Sort: Rating</option>
          <option value="followUp">Sort: Follow-up date</option>
        </select>
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setShowImport((open) => !open);
            setShowAdd(false);
          }}
        >
          {showImport ? "Close import" : "Import prospects"}
        </button>
      </div>

      {showImport ? <ImportPanel onDone={refresh} /> : null}

      <p className="text-sm text-slate-500">
        {searching ? (
          <>
            {visible.length} match{visible.length === 1 ? "" : "es"} across all{" "}
            {live.length} live prospects.
          </>
        ) : (
          <>
            Showing {visible.length}
            {noPhone > 0 ? (
              <>
                {" "}
                — the last {noPhone === 1 ? "one has" : `${noPhone} have`} no
                number yet, so {noPhone === 1 ? "it sits" : "they sit"} at the
                bottom
              </>
            ) : null}
            .
          </>
        )}
      </p>

      <div className="flex flex-col gap-3">
        {live.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            No prospects yet. Use <b>Add prospect</b> after a cold call, save
            firms from the Prospect Finder, or paste in a researched batch with{" "}
            <b>Import prospects</b>.
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Nothing matches that search or filter.
          </p>
        ) : (
          visible.map((business) => (
            <ProspectCard
              // Remount on save so the edit draft is rebuilt from the saved
              // record rather than holding stale values.
              key={`${business.id}:${business.updated_at}`}
              business={business}
              quoteCount={quoteCountsByBusiness.get(business.id) ?? 0}
              expanded={expandedId === business.id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === business.id ? null : business.id,
                )
              }
              onChanged={refresh}
            />
          ))
        )}
      </div>
        </>
      ) : null}
    </section>
  );
}
