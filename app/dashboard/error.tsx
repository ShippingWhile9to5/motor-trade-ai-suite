"use client";

type DashboardErrorProps = {
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-lg rounded-md border border-red-200 bg-white px-5 py-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-red-600">
          Dashboard unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          The app could not load after sign-in.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Check that the local database environment is configured and that the
          dev server was restarted after any environment or config changes.
        </p>
        <button
          type="button"
          className="mt-5 min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </section>
  );
}
