"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCaseAction } from "../actions/cases";

type DeleteCaseButtonProps = {
  caseId: string;
  clientName: string;
};

export function DeleteCaseButton({
  caseId,
  clientName,
}: DeleteCaseButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError("");
    setIsConfirming(false);

    startTransition(async () => {
      try {
        const result = await deleteCaseAction({ id: caseId });

        if (!result.deleted) {
          setError("Case could not be deleted.");
          return;
        }

        router.refresh();
      } catch {
        setError("Case could not be deleted.");
      }
    });
  }

  if (isConfirming) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <p className="text-sm font-medium text-slate-950">
          Delete {clientName}? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            disabled={isPending}
            onClick={handleDelete}
          >
            Confirm delete
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
            disabled={isPending}
            onClick={() => setIsConfirming(false)}
          >
            Cancel
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
        disabled={isPending}
        onClick={() => setIsConfirming(true)}
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
