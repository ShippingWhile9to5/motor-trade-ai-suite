"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCaseAction } from "../actions/cases";

export function CreateCaseForm() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedClientName = clientName.trim();

    if (!trimmedClientName) {
      setError("Enter a client name.");
      return;
    }

    startTransition(async () => {
      try {
        await createCaseAction({
          client_name: trimmedClientName,
        });
        setClientName("");
        router.refresh();
      } catch {
        setError("Case could not be created.");
      }
    });
  }

  return (
    <form
      className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5"
      onSubmit={handleSubmit}
    >
      <label
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
        htmlFor="client-name"
      >
        New case
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="client-name"
          className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 outline-none focus:border-slate-500"
          name="client_name"
          placeholder="Client name"
          type="text"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
        />
        <button
          type="submit"
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "Create case"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
