import { requireUser } from "../../lib/auth";

export default async function DashboardPage() {
  await requireUser();

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 sm:gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Motor Trade AI Suite
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          A minimal project shell for the motor trade insurance workflow
          platform.
        </p>
      </div>
    </section>
  );
}
