export default function CaseDetailLoading() {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-9 w-56 rounded bg-slate-200" />
        <div className="h-5 w-full max-w-lg rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="rounded-md border border-slate-200 bg-white px-4 py-4"
          >
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
