"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createSubmissionAction,
  updateSubmissionAction,
} from "../../../actions/submissions";
import type {
  Submission,
  SubmissionStatus,
} from "../../../../lib/schemas/submission";
import type { ReviewStatus } from "../../../../lib/schemas/review";

type SubmissionPanelProps = {
  caseId: string;
  extractionId?: string;
  reviewStatus?: ReviewStatus;
  submission: Submission | null;
};

const submissionStatusOptions: SubmissionStatus[] = [
  "draft",
  "ready",
  "submitted",
];

export function SubmissionPanel({
  caseId,
  extractionId,
  reviewStatus,
  submission,
}: SubmissionPanelProps) {
  const router = useRouter();
  const [submissionText, setSubmissionText] = useState(
    submission?.submission_text ?? "",
  );
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>(
    submission?.submission_status ?? "draft",
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const hasApprovedReview = reviewStatus === "approved";

  function handleGenerate() {
    setError("");
    setMessage("");

    if (!extractionId || !hasApprovedReview) {
      setError("Approve the review before generating a submission.");
      return;
    }

    startGenerating(async () => {
      const result = await createSubmissionAction({
        case_id: caseId,
        extraction_id: extractionId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSubmissionText(result.submission.submission_text);
      setSubmissionStatus(result.submission.submission_status);
      setMessage("Submission draft generated.");
      router.refresh();
    });
  }

  function handleSave() {
    setError("");
    setMessage("");

    if (!extractionId || !hasApprovedReview || !submission) {
      setError("Generate a submission from an approved review before saving.");
      return;
    }

    startSaving(async () => {
      const result = await updateSubmissionAction({
        case_id: caseId,
        extraction_id: extractionId,
        submission_text: submissionText,
        submission_status: submissionStatus,
      });

      if (!result) {
        setError("Submission could not be saved.");
        return;
      }

      setSubmissionText(result.submission_text);
      setSubmissionStatus(result.submission_status);
      setMessage("Submission saved.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Submission draft
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Generate from an approved review, then edit before marking ready or
            submitted.
          </p>
          <Link
            href={`/dashboard/cases/${caseId}/submission-composer`}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            Open submission composer
          </Link>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {submissionStatus}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {!hasApprovedReview ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-slate-950">
              Submission unavailable.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Approve the review before generating a draft.
            </p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="submission_text"
            className="block text-sm font-medium text-slate-950"
          >
            Draft text
          </label>
          <textarea
            id="submission_text"
            value={submissionText}
            rows={10}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950"
            placeholder="Generate a submission draft from an approved review."
            onChange={(event) => setSubmissionText(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="submission_status"
            className="block text-sm font-medium text-slate-950"
          >
            Status
          </label>
          <select
            id="submission_status"
            value={submissionStatus}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 sm:max-w-xs"
            onChange={(event) =>
              setSubmissionStatus(event.target.value as SubmissionStatus)
            }
          >
            {submissionStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
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
          className="min-h-11 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          disabled={isGenerating || !hasApprovedReview}
          onClick={handleGenerate}
        >
          {isGenerating ? "Generating..." : "Generate submission"}
        </button>
        <button
          type="button"
          className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
          disabled={isSaving || !submission}
          onClick={handleSave}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </section>
  );
}
