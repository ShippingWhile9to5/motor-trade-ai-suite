"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { executeExtractionAction } from "../../../actions/extractions";

type ExtractionTriggerProps = {
  caseId: string;
  documentReferenceId?: string;
  extractionStatus?: string;
};

export function ExtractionTrigger({
  caseId,
  documentReferenceId,
  extractionStatus,
}: ExtractionTriggerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRunExtraction() {
    setMessage("");
    setError("");

    if (!documentReferenceId) {
      setError("Add a document before running extraction.");
      return;
    }

    startTransition(async () => {
      const result = await executeExtractionAction({
        case_id: caseId,
        document_reference_id: documentReferenceId,
      });

      if (!result.success) {
        setError("error" in result ? result.error : "Extraction result was invalid.");
        return;
      }

      setMessage("Extraction result created for review.");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        className="min-h-11 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        disabled={isPending || !documentReferenceId}
        onClick={handleRunExtraction}
      >
        {isPending ? "Running extraction..." : "Run extraction"}
      </button>

      <p className="text-sm text-slate-600">
        {extractionStatus
          ? `Current extraction status: ${extractionStatus}.`
          : documentReferenceId
            ? "Uses the first saved document reference."
            : "No document is available for extraction yet."}
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
