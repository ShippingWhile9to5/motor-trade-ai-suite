"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  saveProspectAction,
  searchCompaniesAction,
} from "../actions/prospect-finder";
import {
  MOTOR_TRADE_SIC_CODES,
  formatCompanyAddress,
  formatIncorporatedDate,
} from "../../lib/prospect-finder";
import type { CompanySearchResult } from "../../lib/schemas/companies-house";

type SaveState = "idle" | "saving" | "saved" | "exists" | "failed";

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === "active";

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
}

function ResultCard({ company }: { company: CompanySearchResult }) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isPending, startTransition] = useTransition();
  const address = formatCompanyAddress(company);
  const incorporated = formatIncorporatedDate(company.date_of_creation);

  function handleSave() {
    setSaveState("saving");
    startTransition(async () => {
      const outcome = await saveProspectAction(company);

      if (!outcome.ok) {
        setSaveState("failed");
        return;
      }

      setSaveState(outcome.result.alreadySaved ? "exists" : "saved");
    });
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved to prospects"
        : saveState === "exists"
          ? "Already saved"
          : saveState === "failed"
            ? "Save failed - retry"
            : "Save as prospect";

  const saved = saveState === "saved" || saveState === "exists";

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">
              {company.company_name}
            </p>
            <StatusBadge status={company.company_status} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            No. {company.company_number}
            {incorporated ? ` · Incorporated ${incorporated}` : ""}
          </p>
          {address ? (
            <p className="mt-1 text-sm text-slate-600">{address}</p>
          ) : null}
          {company.sic_codes.length > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              SIC: {company.sic_codes.join(", ")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 disabled:opacity-60"
          onClick={handleSave}
          disabled={isPending || saved}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

export function ProspectFinderPanel() {
  const [sicCode, setSicCode] = useState("");
  const [area, setArea] = useState("");
  const [includeDissolved, setIncludeDissolved] = useState(false);
  const [results, setResults] = useState<CompanySearchResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      const outcome = await searchCompaniesAction({
        sic_code: sicCode,
        area,
        include_dissolved: includeDissolved,
      });

      if (!outcome.ok) {
        setError(outcome.error);
        setResults(null);
        return;
      }

      setResults(outcome.result.items);
      setTotal(outcome.result.total);
    });
  }

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
            Prospect Finder
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Search Companies House by SIC code to find motor-trade firms, then
            save any of them straight to your prospects.
          </p>
        </div>
      </header>

      <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-slate-950">
              SIC code
            </span>
            <input
              type="text"
              value={sicCode}
              placeholder="e.g. 45200"
              inputMode="numeric"
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) => setSicCode(event.target.value)}
            />
            <span className="mt-2 flex flex-wrap gap-1.5">
              {MOTOR_TRADE_SIC_CODES.map((sic) => (
                <button
                  key={sic.code}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    sicCode === sic.code
                      ? "border-slate-400 bg-slate-100 text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setSicCode(sic.code)}
                >
                  {sic.code} · {sic.label}
                </button>
              ))}
            </span>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-950">
              Area (optional)
            </span>
            <input
              type="text"
              value={area}
              placeholder="e.g. Liverpool"
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) => setArea(event.target.value)}
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeDissolved}
                className="h-4 w-4"
                onChange={(event) => setIncludeDissolved(event.target.checked)}
              />
              Include dissolved companies
            </label>
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            onClick={handleSearch}
            disabled={isPending || sicCode.trim() === ""}
          >
            {isPending ? "Searching..." : "Search"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {results ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-500">
            {results.length === 0
              ? "No companies found for that search."
              : `Showing ${results.length} of ${total} result${total === 1 ? "" : "s"}.`}
          </p>
          {results.map((company) => (
            <ResultCard key={company.company_number} company={company} />
          ))}
        </section>
      ) : null}
    </section>
  );
}
