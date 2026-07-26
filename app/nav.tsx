"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoardIcon,
  ComposerIcon,
  HomeIcon,
  ScheduleIcon,
  SearchIcon,
  TrackerIcon,
} from "./icons";

const LINKS = [
  { href: "/", label: "Today", Icon: HomeIcon },
  { href: "/prospect-finder", label: "Finder", Icon: SearchIcon },
  { href: "/prospect-board", label: "Board", Icon: BoardIcon },
  { href: "/composer", label: "Composer", Icon: ComposerIcon },
  { href: "/quote-tracker", label: "Quotes", Icon: TrackerIcon },
  { href: "/policy-letter", label: "Schedule", Icon: ScheduleIcon },
] as const;

export function Nav({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-sm font-bold text-white">
              M
            </span>
            <span className="hidden text-sm font-semibold text-slate-950 sm:block">
              Motor Trade AI Suite
            </span>
          </Link>

          {/* Scrolls rather than wraps on a phone, so the bar stays one line. */}
          <div className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto px-1">
            {LINKS.map(({ href, label, Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              );
            })}
          </div>

          {children ? (
            <div className="flex shrink-0 items-center gap-3">{children}</div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
