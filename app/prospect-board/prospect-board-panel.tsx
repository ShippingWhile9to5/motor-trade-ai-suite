"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBusinessAction,
  deleteBusinessAction,
  importProspectsAction,
  updateBusinessAction,
} from "../actions/businesses";
import {
  type BoardSort,
  type FollowUpState,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  filterBusinesses,
  getBoardStats,
  getFollowUpState,
  sortBusinesses,
  todayIso,
} from "../../lib/prospect-board";
import type {
  Business,
  BusinessPipelineStatus,
} from "../../lib/schemas/business";

type ProspectBoardPanelProps = {
  businesses: Business[];
  loadError: boolean;
};

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
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        Import a backup
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste the JSON export from the old Prospect Board. Duplicates are matched
        on company number, then name, so importing twice is safe.
      </p>
      <textarea
        rows={5}
        value={text}
        placeholder='[ { "name": "…", "companyNumber": "…" } ]'
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
  expanded,
  onToggle,
  onChanged,
}: {
  business: Business;
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

  function updateDraft<Key extends keyof Business>(
    key: Key,
    value: Business[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const summary = [business.location, business.phone]
    .filter(Boolean)
    .join(" · ");

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
              className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
            <button
              type="button"
              disabled={isPending}
              className="ml-auto min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProspectBoardPanel({
  businesses,
  loadError,
}: ProspectBoardPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BusinessPipelineStatus | "">("");
  const [sort, setSort] = useState<BoardSort>("rating");
  const [onlyDue, setOnlyDue] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  const today = todayIso();
  const stats = useMemo(
    () => getBoardStats(businesses, today),
    [businesses, today],
  );
  const visible = useMemo(
    () =>
      sortBusinesses(
        filterBusinesses(businesses, { search, status, onlyDue }, today),
        sort,
      ),
    [businesses, search, status, onlyDue, sort, today],
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
            className="min-h-11 shrink-0 rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>
          <b className="text-slate-950">{stats.total}</b> prospects
        </span>
        <span>
          <b className="text-slate-950">{stats.toContact}</b> to contact
        </span>
        {stats.due > 0 ? (
          <span className="text-amber-700">
            <b>{stats.due}</b> due now
          </span>
        ) : null}
        {stats.overdue > 0 ? (
          <span className="text-red-700">
            <b>{stats.overdue}</b> overdue
          </span>
        ) : null}
        <span>
          <b className="text-slate-950">{stats.quoting}</b> quoting
        </span>
        <span>
          <b className="text-slate-950">{stats.won}</b> won
        </span>
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
          value={status}
          aria-label="Filter by status"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          onChange={(event) =>
            setStatus(event.target.value as BusinessPipelineStatus | "")
          }
        >
          <option value="">All statuses</option>
          {PIPELINE_STATUSES.map((option) => (
            <option key={option} value={option}>
              {PIPELINE_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          value={sort}
          aria-label="Sort prospects"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          onChange={(event) => setSort(event.target.value as BoardSort)}
        >
          <option value="rating">Sort: Rating</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="followUp">Sort: Follow-up date</option>
        </select>
        <button
          type="button"
          className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium ${
            onlyDue
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => setOnlyDue((value) => !value)}
        >
          Due today
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setShowImport((open) => !open);
            setShowAdd(false);
          }}
        >
          {showImport ? "Close import" : "Import backup"}
        </button>
      </div>

      {showImport ? <ImportPanel onDone={refresh} /> : null}

      <div className="flex flex-col gap-3">
        {businesses.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            No prospects yet. Use <b>Add prospect</b> after a cold call, save
            firms from the Prospect Finder, or import a backup.
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
    </section>
  );
}
