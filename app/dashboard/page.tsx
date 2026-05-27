import Link from "next/link";
import { listCasesAction } from "../actions/cases";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const cases = await listCasesAction();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Motor Trade AI Suite
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Current motor trade cases and workflow status.
        </p>
      </header>

      {cases.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center sm:px-6">
          <p className="text-base font-medium text-slate-950">No cases yet.</p>
          <p className="mt-2 text-sm text-slate-600">
            Created cases will appear here when they are available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((caseRecord) => (
            <Link
              key={caseRecord.id}
              href={`/dashboard/cases/${caseRecord.id}`}
              className="block rounded-md border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium text-slate-950">
                    {caseRecord.client_name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Updated {formatDate(caseRecord.updated_at)}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                  {caseRecord.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
