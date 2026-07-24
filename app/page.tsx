import Link from "next/link";

function ToolCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-slate-200 bg-white px-5 py-6 hover:border-slate-300 hover:bg-slate-50"
    >
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

export default function Home() {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
          Motor Trade AI Suite
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Two standalone tools. Nothing you enter is saved - each one is a
          fill-in, copy-out step you use once per case.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ToolCard
          href="/quote-tracker"
          title="Quote Tracker"
          description="Track every quote from submission to close on a kanban board, with amber/red flags when a quote needs chasing."
        />
        <ToolCard
          href="/prospect-finder"
          title="Prospect Finder"
          description="Search Companies House by SIC code to find motor-trade firms and save them straight to your prospects."
        />
        <ToolCard
          href="/composer"
          title="Submission Composer"
          description="Fill in the fact-find details to generate the Motor Trade and Material Damage additional information plus the underwriter email."
        />
        <ToolCard
          href="/policy-letter"
          title="Policy Letter Generator"
          description="Upload a policy schedule PDF to extract endorsements, conditions, exclusions and excesses, then generate the client quote letter."
        />
      </div>
    </section>
  );
}
