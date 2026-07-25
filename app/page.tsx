import Link from "next/link";

// The tools in the order the work actually happens: find a firm, work it,
// submit it, track it, then write to the client once it is won.
const TOOLS = [
  {
    href: "/prospect-finder",
    step: "01",
    title: "Prospect Finder",
    description:
      "Search Companies House by SIC code to find motor-trade firms in an area, and save the good ones.",
  },
  {
    href: "/prospect-board",
    step: "02",
    title: "Prospect Board",
    description:
      "Work your list. Set a call-back date and the card flags itself the day it falls due.",
  },
  {
    href: "/composer",
    step: "03",
    title: "Submission Composer",
    description:
      "Turn the fact-find into the Motor Trade and Material Damage wording, plus the underwriter email.",
  },
  {
    href: "/quote-tracker",
    step: "04",
    title: "Quote Tracker",
    description:
      "Follow every quote from submission to close, with amber and red flags when one needs chasing.",
  },
  {
    href: "/policy-letter",
    step: "05",
    title: "Policy Letter Generator",
    description:
      "Read the policy schedule and pull out the endorsements, conditions, exclusions and excesses for the client letter.",
  },
] as const;

function ToolStep({
  tool,
  isLast,
}: {
  tool: (typeof TOOLS)[number];
  isLast: boolean;
}) {
  return (
    <li className="relative pl-14 sm:pl-16">
      <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold tabular-nums text-slate-500">
        {tool.step}
      </span>
      {/* The rail joining one step to the next, so the page reads as a run
          through the job rather than five unrelated tiles. */}
      {isLast ? null : (
        <span
          aria-hidden="true"
          className="absolute bottom-[-0.75rem] left-5 top-10 w-px bg-slate-200"
        />
      )}
      <Link
        href={tool.href}
        className="group block rounded-lg border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold text-slate-950">
            {tool.title}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600"
          >
            →
          </span>
        </span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">
          {tool.description}
        </span>
      </Link>
    </li>
  );
}

export default function Home() {
  return (
    <section className="flex w-full max-w-3xl flex-1 flex-col gap-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Motor Trade AI Suite
        </h1>
        <p className="mt-2 text-base text-slate-600">
          From first cold call to the client&rsquo;s policy letter.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {TOOLS.map((tool, index) => (
          <ToolStep
            key={tool.href}
            tool={tool}
            isLast={index === TOOLS.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}
