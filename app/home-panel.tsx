"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createReminderAction,
  deleteReminderAction,
  updateReminderAction,
} from "./actions/reminders";
import { buildTodayList, type TodayItem } from "../lib/today";
import { formatTopProspects, pickTopProspects } from "../lib/top-five";
import { todayIso } from "../lib/reporting";
import type { Business } from "../lib/schemas/business";
import type { QuoteWithClient } from "../lib/schemas/quote";
import type { Reminder } from "../lib/schemas/reminder";

type HomePanelProps = {
  reminders: Reminder[];
  businesses: Business[];
  quotes: QuoteWithClient[];
  loadError: boolean;
};

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

const KIND_LABEL: Record<TodayItem["kind"], string> = {
  reminder: "Reminder",
  "follow-up": "Call back",
  quote: "Quote",
};

const KIND_STYLE: Record<TodayItem["kind"], string> = {
  reminder: "bg-violet-100 text-violet-700",
  "follow-up": "bg-blue-100 text-blue-700",
  quote: "bg-amber-100 text-amber-800",
};

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

function AddReminder({
  businesses,
  onDone,
}: {
  businesses: Business[];
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [businessId, setBusinessId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const outcome = await createReminderAction({
        body,
        due_date: dueDate,
        business_id: businessId,
      });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      setBody("");
      setBusinessId("");
      onDone();
    });
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Remind me to
          </span>
          <input
            type="text"
            value={body}
            placeholder="e.g. Call Fraser back about the renewal"
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && body.trim() !== "") {
                handleSubmit();
              }
            }}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            When
          </span>
          <input
            type="date"
            value={dueDate}
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Firm (optional)
          </span>
          <select
            value={businessId}
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 sm:max-w-[14rem]"
            onChange={(event) => setBusinessId(event.target.value)}
          >
            <option value="">Not linked</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isPending || body.trim() === ""}
        >
          {isPending ? "Saving..." : "Add"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        No firm needed — a note to yourself after a cold call works on its own.
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function TodayRow({
  item,
  onChanged,
}: {
  item: TodayItem;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const reminderId =
    item.kind === "reminder" ? item.id.replace("reminder:", "") : null;

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onChanged();
    });
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        item.overdue ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[item.kind]}`}
          >
            {KIND_LABEL[item.kind]}
          </span>
          <span className="text-sm font-semibold text-slate-950">
            {item.title}
          </span>
          {item.overdue ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Overdue
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {item.detail}
          {item.dueDate ? ` · due ${item.dueDate}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {reminderId ? (
          <>
            <button
              type="button"
              disabled={isPending}
              className="min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() =>
                run(() =>
                  updateReminderAction({ id: reminderId, done: true }),
                )
              }
            >
              Done
            </button>
            <button
              type="button"
              disabled={isPending}
              className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-500 hover:border-red-300 hover:text-red-700 disabled:opacity-60"
              onClick={() =>
                run(() => deleteReminderAction({ id: reminderId }))
              }
            >
              Delete
            </button>
          </>
        ) : (
          <Link
            href={item.kind === "quote" ? "/quote-tracker" : "/prospect-board"}
            className="min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Open
          </Link>
        )}
      </div>
    </div>
  );
}

function TopFive({
  businesses,
  quotes,
  today,
}: {
  businesses: Business[];
  quotes: QuoteWithClient[];
  today: string;
}) {
  const [count, setCount] = useState(5);
  const [copied, setCopied] = useState(false);
  const text = useMemo(
    () => formatTopProspects(pickTopProspects(businesses, quotes, count), today),
    [businesses, quotes, count, today],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Top {count} for the meeting
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Your most advanced live deals, ready to paste.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={count}
            aria-label="How many prospects"
            className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950"
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {[5, 10, 15].map((option) => (
              <option key={option} value={option}>
                Top {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="min-h-9 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            onClick={copy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-3 font-mono text-xs leading-6 text-slate-800">
        {text}
      </pre>
    </div>
  );
}

export function HomePanel({
  reminders,
  businesses,
  quotes,
  loadError,
}: HomePanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [showTopFive, setShowTopFive] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  const today = todayIso();
  const items = useMemo(
    () => buildTodayList({ reminders, businesses, quotes }, today),
    [reminders, businesses, quotes, today],
  );
  const overdue = items.filter((item) => item.overdue).length;

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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Today</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {loadError
                ? "Could not load your list."
                : items.length === 0
                  ? "Nothing due. Add a reminder when someone asks you to call back."
                  : `${items.length} thing${items.length === 1 ? "" : "s"} need${items.length === 1 ? "s" : ""} you${overdue > 0 ? `, ${overdue} overdue` : ""}.`}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => setShowAdd((open) => !open)}
          >
            {showAdd ? "Close" : "+ Add reminder"}
          </button>
        </div>

        {showAdd ? (
          <AddReminder
            businesses={businesses}
            onDone={() => {
              setShowAdd(false);
              refresh();
            }}
          />
        ) : null}

        {items.map((item) => (
          <TodayRow key={item.id} item={item} onChanged={refresh} />
        ))}
      </section>

      <section>
        <button
          type="button"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          onClick={() => setShowTopFive((open) => !open)}
        >
          {showTopFive ? "Hide the meeting list" : "Top 5 for the meeting →"}
        </button>
        {showTopFive ? (
          <div className="mt-3">
            <TopFive businesses={businesses} quotes={quotes} today={today} />
          </div>
        ) : null}
      </section>

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
