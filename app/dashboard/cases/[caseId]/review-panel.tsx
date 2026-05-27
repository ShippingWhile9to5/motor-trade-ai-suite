"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createReviewAction,
  updateReviewAction,
} from "../../../actions/reviews";
import type {
  ExtractionField,
  FactFindExtraction,
} from "../../../../lib/schemas/extraction";
import type { ExtractionReview } from "../../../../lib/schemas/review";

type ReviewPanelProps = {
  caseId: string;
  extractionId?: string;
  extractionOutput: FactFindExtraction | null;
  review: ExtractionReview | null;
};

type FieldPath = Array<string | number>;

type FieldRow = {
  path: FieldPath;
  label: string;
  field: ExtractionField;
};

const sectionLabels: Record<keyof FactFindExtraction, string> = {
  business_details: "Business details",
  premises: "Premises",
  security: "Security",
  vehicles_and_stock: "Vehicles and stock",
  drivers: "Drivers",
  claims_history: "Claims history",
  current_insurance: "Current insurance",
  cover_required: "Cover required",
};

function isExtractionField(value: unknown): value is ExtractionField {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "value" in value &&
    "confidence" in value &&
    "source_reference" in value &&
    "requires_review" in value &&
    "is_missing_required" in value
  );
}

function toLabel(path: FieldPath) {
  return String(path.at(-1) ?? "")
    .replaceAll("_", " ")
    .replace(/^\d+$/, (value) => `Item ${Number(value) + 1}`);
}

function valueToText(value: ExtractionField["value"]) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function collectFields(value: unknown, path: FieldPath = []): FieldRow[] {
  if (isExtractionField(value)) {
    return [
      {
        path,
        label: toLabel(path),
        field: value,
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectFields(item, [...path, index]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectFields(nestedValue, [...path, key]),
    );
  }

  return [];
}

function updateFieldValue(
  extraction: FactFindExtraction,
  path: FieldPath,
  value: string,
) {
  const nextExtraction = structuredClone(extraction);
  let cursor: unknown = nextExtraction;

  path.forEach((pathPart) => {
    if (cursor && typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[String(pathPart)];
    }
  });

  if (isExtractionField(cursor)) {
    cursor.value = value;
  }

  return nextExtraction;
}

export function ReviewPanel({
  caseId,
  extractionId,
  extractionOutput,
  review,
}: ReviewPanelProps) {
  const router = useRouter();
  const initialOutput = review?.reviewed_output ?? extractionOutput;
  const [reviewedOutput, setReviewedOutput] =
    useState<FactFindExtraction | null>(initialOutput);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleValueChange(path: FieldPath, value: string) {
    if (!reviewedOutput) {
      return;
    }

    setReviewedOutput(updateFieldValue(reviewedOutput, path, value));
  }

  function submitReview(reviewStatus: "approved" | "needs_changes") {
    setError("");
    setMessage("");

    if (!extractionId || !reviewedOutput) {
      setError("Run extraction before reviewing fields.");
      return;
    }

    startTransition(async () => {
      const input = {
        case_id: caseId,
        extraction_id: extractionId,
        reviewed_output: reviewedOutput,
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
      };
      const result = review
        ? await updateReviewAction(input)
        : await createReviewAction(input);

      if (!result) {
        setError("Review could not be saved.");
        return;
      }

      setMessage(
        reviewStatus === "approved"
          ? "Review approved."
          : "Review marked as needing changes.",
      );
      router.refresh();
    });
  }

  if (!reviewedOutput) {
    return (
      <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Review extraction
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          No extraction output is available yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Review extraction
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Edit extracted values, then approve or request changes.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {review?.review_status ?? "pending"}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {Object.entries(reviewedOutput).map(([sectionKey, sectionValue]) => {
          const rows = collectFields(sectionValue, [sectionKey]);

          return (
            <section key={sectionKey} className="space-y-3">
              <h3 className="text-base font-medium text-slate-950">
                {sectionLabels[sectionKey as keyof FactFindExtraction]}
              </h3>
              {rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                  No extracted fields in this section.
                </p>
              ) : (
                <div className="space-y-3">
                  {rows.map(({ path, label, field }) => (
                    <div
                      key={path.join(".")}
                      className={`rounded-md border px-4 py-3 ${
                        field.is_missing_required
                          ? "border-red-300 bg-red-50"
                          : field.requires_review
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <label className="block text-sm font-medium text-slate-950">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={valueToText(field.value)}
                        className={`mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-950 ${
                          field.is_missing_required
                            ? "border-red-300"
                            : "border-slate-300"
                        }`}
                        onChange={(event) =>
                          handleValueChange(path, event.target.value)
                        }
                      />
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Confidence {Math.round(field.confidence * 100)}%
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Requires review {field.requires_review ? "yes" : "no"}
                        </span>
                        {field.is_missing_required ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-700">
                            Missing required
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            Required value present
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          disabled={isPending}
          onClick={() => submitReview("approved")}
        >
          {isPending ? "Saving..." : "Approve"}
        </button>
        <button
          type="button"
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
          disabled={isPending}
          onClick={() => submitReview("needs_changes")}
        >
          Needs changes
        </button>
      </div>
    </section>
  );
}
