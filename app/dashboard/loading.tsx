export default function DashboardLoading() {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-9 w-48 rounded bg-slate-200" />
        <div className="h-5 w-full max-w-xl rounded bg-slate-200" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-md border border-slate-200 bg-white px-4 py-4 sm:px-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="h-5 w-44 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
